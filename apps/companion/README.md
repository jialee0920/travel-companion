# 묵호 동행 · 웹 MVP

Next.js 웹앱 — 묵호 지역 동행 찾기 + 공동구매 + 1:1 채팅 + 마이페이지.

**Repository:** https://github.com/bodinote2026/travel-companion  
**App path:** `apps/companion`

## 로컬 실행

```bash
# 저장소 루트
git clone https://github.com/bodinote2026/travel-companion.git
cd travel-companion
npm install
npm run dev
# http://localhost:3001
```

## Vercel 배포 (bodinote 팀)

| 설정 | 값 |
|------|-----|
| Git Repository | `bodinote2026/travel-companion` |
| Root Directory | `apps/companion` |
| Production Branch | `main` |

환경 변수는 `.env.local.example` 참고 (Airtable, PG 결제 `PAYMENT_*`, `AUTH_SESSION_SECRET`).

## 범위

- ✅ 묵호 지역 데이터, GPS 거리·각도 (화면 사용 중)
- ✅ 공동구매, PG 직접 연동 (나이스페이 샌드박스, `PAYMENT_PROVIDER`로 교체 가능)
- ✅ Airtable 기반 로그인·주문·1:1 채팅 (폴링), 마이페이지·주문 내역
