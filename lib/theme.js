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
export const DEMO_STORES = [
  { id: 1, name: "우리분식 상도점", addr: "상도로 195 앞 (지정 배출 지점)" },
  { id: 2, name: "상도곱창 본점", addr: "상도로 214 앞" },
  { id: 3, name: "행복슈퍼", addr: "성대로1길 7 앞" },
];
