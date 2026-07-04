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

export const PRICE_PER_KG = 70; // 폐지 시세 (원/kg, 데모 기준)

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
export const CART_SPEED_KMH = 2.3; // 리어카 보행 속도
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
