# 종이길 (Paper Route)

가게 앞에 배출된 폐지를 사진 한 장으로 등록하면, AI가 양·예상 수익을 추정해
폐지 수집 어르신께 전달하는 웹 서비스입니다.

- `/` 역할 선택 (점주 / 어르신)
- `/store` 점주 화면 — 사진 업로드 → AI 분석 → 배출 등록
- `/list` 어르신 화면 — 큰 글씨 목록, "제가 갈게요" 선점(30분), 수거 완료 처리
- `/api/analyze` 서버 함수 — Anthropic 비전 API 호출 (키는 서버에만 존재)

## 배포 순서 (처음부터 끝까지)

### 1. GitHub에 올리기
```bash
cd paper-route
git init
git add .
git commit -m "종이길 초기 버전"
```
GitHub에서 새 저장소(예: paper-route)를 만든 뒤:
```bash
git remote add origin https://github.com/<내아이디>/paper-route.git
git branch -M main
git push -u origin main
```

### 2. Supabase (데이터베이스)
1. https://supabase.com 가입 → New project (무료 플랜, 리전은 Northeast Asia 아무거나)
2. 왼쪽 메뉴 **SQL Editor** → `supabase-schema.sql` 내용 전체를 붙여넣고 **Run**
3. **Project Settings > API** 에서 두 값을 복사해 둡니다:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - anon public 키 → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 3. Anthropic API 키 (AI 사진 분석)
1. https://console.anthropic.com 가입 → 결제 수단 등록 (최소 크레딧 충전)
2. **API Keys** 에서 키 생성 → `ANTHROPIC_API_KEY`
3. 이 키는 코드/GitHub 어디에도 넣지 않습니다. 다음 단계의 Vercel 환경변수에만.

### 4. Vercel (배포)
1. https://vercel.com 을 GitHub 계정으로 가입
2. **Add New > Project** → paper-route 저장소 Import
3. **Environment Variables** 에 세 개 등록:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `ANTHROPIC_API_KEY`
4. **Deploy** → 1~2분 뒤 `https://paper-route-xxxx.vercel.app` 주소 발급
5. 이 주소가 지원서에 적을 제출 URL입니다.

### 5. 확인 체크리스트
- [ ] PC에서 URL 열기 → 역할 선택 화면이 뜸
- [ ] 어르신 화면에 시드 데이터 2건이 보임
- [ ] 점주 화면에서 박스 사진 업로드 → AI 분석 결과(kg, 원)가 나옴
- [ ] "배출 알리기" → 어르신 화면 목록에 새 항목이 뜸 (8초 내 자동 갱신)
- [ ] "제가 갈게요" → 상태가 "가는 중 · ○분 남음"으로 바뀜
- [ ] 폰에서도 열어서 화면 확인

## 로컬에서 돌려보기 (선택)
```bash
npm install
cp .env.local.example .env.local   # 값 채우기
npm run dev                         # http://localhost:3000
```

## 구조 메모
- 사진은 업로드 전 브라우저에서 긴 변 900px로 축소됩니다 (전송량·API 비용 절감)
- 어르신 화면은 8초 간격 폴링으로 갱신됩니다 (데모 규모에서는 충분)
- 선점(claim)은 30분 뒤 자동 해제됩니다 (claimed_until 비교)
- 데모 정책상 DB가 공개 읽기/쓰기입니다. 실서비스 전환 시 인증·정책 강화 필요
