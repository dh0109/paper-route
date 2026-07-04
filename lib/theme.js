// 디자인 토큰 — 골판지(크라프트)를 시각 아이덴티티로
export const T = {
  kraft: "#C4A06A",
  kraftDeep: "#8F6B3D",
  ink: "#26221B",
  paper: "#FFFFFF",
  field: "#F4EFE6",
  green: "#1E7A3C",
  greenBg: "#E8F5EC",
  orange: "#D9480F",
  orangeBg: "#FDEEE4",
  gray: "#8A857C",
  grayBg: "#EFEDE8",
  line: "#DCD5C8",
};

// ── 폐지 단가: 공공데이터 기반 ──────────────────────────
// 출처: 한국환경공단 자원순환정보시스템 「재활용가능자원 가격조사」
// 2026.06 수도권 골판지 공표가 91.8원/kg (전국평균 81.5원)
// 공표가는 재활용업체(압축상) 매입가 기준이므로, 어르신이 실제 거래하는
// 고물상 매입가 수준으로 보정(×0.65)하여 보수적으로 표시합니다.
// 매월 공표 시 OFFICIAL_PRICE와 PRICE_MONTH만 갱신하면 됩니다.
export const OFFICIAL_PRICE = 91.8; // 원/kg, 수도권 골판지 공표가
export const PRICE_MONTH = "2026.6"; // 공표 기준월
export const DEALER_FACTOR = 0.65; // 고물상 매입가 보정률
export const PRICE_PER_KG = Math.round(OFFICIAL_PRICE * DEALER_FACTOR); // ≈ 60원/kg
export const PRICE_SOURCE = `골판지 ${PRICE_PER_KG}원/kg 기준 · 자원순환정보시스템 ${PRICE_MONTH} 수도권 공표가(${OFFICIAL_PRICE}원)에 고물상 매입 보정`;

export const fmt = (n) => Number(n).toLocaleString("ko-KR");

// 데모용 점포 목록 (실서비스에서는 QR의 id 파라미터로 결정됨)
// lat/lng: 이동 시간 계산용 좌표 (상도동 일대 예시 좌표)
export const DEMO_STORES = [
  { id: 1, name: "우리분식 상도점", addr: "상도로 195 앞 (지정 배출 지점)", lat: 37.4984, lng: 126.9472 },
  { id: 2, name: "상도곱창 본점", addr: "상도로 214 앞", lat: 37.4991, lng: 126.9495 },
  { id: 3, name: "행복슈퍼", addr: "성대로1길 7 앞", lat: 37.4963, lng: 126.9531 },
];

// 리어카 이동 모델 — 일반 도보(4~4.5km/h)가 아닌,
// 짐 실은 리어카 + 고령 보행 기준 속도와 도로 우회 계수
// 속도 근거: 한 외(2020) 보행보조장치 사용 노인의 지점별 하위 15퍼센타일
// 실측 보행속도 0.59~0.60m/s(시청·육거리시장) — 상가 밀집 환경 유사성 반영
export const CART_SPEED_KMH = 2.16; // = 0.60 m/s
export const DETOUR_FACTOR = 1.35; // 직선거리 → 실제 보행거리 보정
export const MAX_CLAIM_MINUTES = 25; // 이보다 멀면 선점 불가 (원거리 욕심 선점 방지)

// 두 좌표 사이 직선거리(km) — Haversine
export function distKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

// 리어카 기준 예상 이동 시간(분)
export function cartMinutes(lat1, lng1, lat2, lng2) {
  const km = distKm(lat1, lng1, lat2, lng2) * DETOUR_FACTOR;
  return Math.max(1, Math.round((km / CART_SPEED_KMH) * 60));
}
