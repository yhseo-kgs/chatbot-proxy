# Vercel 환경변수 설정 가이드

## 필요한 환경변수들

다음 환경변수들을 Vercel 대시보드에서 설정해야 합니다:

### 1. NCP (Naver Cloud Platform) 인증 정보
- `NCP_ACCESS_KEY`: 네이버 클라우드 플랫폼 Access Key
- `NCP_SECRET_KEY`: 네이버 클라우드 플랫폼 Secret Key

### 2. CLOVA Studio API 키
- `CLOVA_API_KEY`: CLOVA Studio API Bearer 토큰

## Vercel에서 환경변수 설정 방법

1. Vercel 대시보드에 로그인
2. 프로젝트 선택
3. Settings → Environment Variables
4. 다음 변수들을 추가:
   - Name: `NCP_ACCESS_KEY`, Value: `your_access_key`
   - Name: `NCP_SECRET_KEY`, Value: `your_secret_key`  
   - Name: `CLOVA_API_KEY`, Value: `your_clova_api_key`

## 보안 주의사항

- ⚠️ 절대로 환경변수를 코드에 하드코딩하지 마세요
- ⚠️ API 키는 클라이언트 사이드에서 접근할 수 없도록 서버 사이드에서만 사용
- ⚠️ 프로덕션 환경에서는 적절한 CORS 정책 설정 권장
