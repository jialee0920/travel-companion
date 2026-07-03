# 묵호 동행 · 웹 MVP

Next.js 웹앱 — 묵호 지역 동행 찾기 + 공동구매 + PortOne 테스트 결제.

## 로컬 실행

```bash
# 저장소 루트
npm install
npm run dev
# http://localhost:3001
```

Vercel 배포 시 **Root Directory**: `apps/companion` (또는 루트 `vercel.json` 사용)

## 환경 변수

`apps/companion/.env.local.example` 참고

## 범위

- ✅ 묵호 지역 데이터, GPS 거리·각도 (화면 사용 중)
- ✅ 공동구매, PortOne(아임포트) 테스트 PG
- ⏸ 채팅·마이페이지 → `docs/future-features.md`
