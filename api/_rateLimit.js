const RATE_LIMIT = {
  windowMs: 60 * 1000, // 1분
  max: 20              // 분당 20회
};

const rateMap = new Map();

// 오래된 엔트리 정리 (10분 이상 된 것)
function cleanupOldEntries() {
  const now = Date.now();
  const maxAge = 10 * 60 * 1000; // 10분
  for (const [ip, entry] of rateMap.entries()) {
    if (now - entry.start > maxAge) {
      rateMap.delete(ip);
    }
  }
}

// IP 추출 (프록시 체인 고려)
function getClientIP(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded) {
    // x-forwarded-for는 "ip1, ip2, ip3" 형식일 수 있음
    return forwarded.split(",")[0].trim();
  }
  return req.socket?.remoteAddress || req.ip || "unknown";
}

export function rateLimit(req, res) {
  // 주기적 정리 (10% 확률로 실행하여 성능 영향 최소화)
  if (Math.random() < 0.1) {
    cleanupOldEntries();
  }

  const ip = getClientIP(req);
  const now = Date.now();
  const entry = rateMap.get(ip) || { count: 0, start: now };

  // 시간 윈도우가 지났으면 리셋
  if (now - entry.start > RATE_LIMIT.windowMs) {
    entry.count = 1;
    entry.start = now;
  } else {
    entry.count++;
  }

  rateMap.set(ip, entry);

  // 제한 초과 시
  if (entry.count > RATE_LIMIT.max) {
    res.status(429).json({ 
      ok: false, 
      error: "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요." 
    });
    return true; // 제한됨
  }

  return false; // 허용됨
}

