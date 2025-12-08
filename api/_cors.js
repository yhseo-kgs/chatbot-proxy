export function applyCors(req, res) {
  const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map(s => s.trim())
    : [];

  const origin = req.headers.origin;
  const isAllowed = allowedOrigins.includes(origin);

  if (isAllowed) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }

  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // Preflight 요청 처리
  if (req.method === "OPTIONS") {
    res.status(200).end();
    return true;
  }

  return false;
}

