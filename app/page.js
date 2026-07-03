import Link from "next/link";
import { T } from "../lib/theme";

export default function Home() {
  const card = {
    display: "block",
    background: "#fff",
    borderRadius: 14,
    padding: "22px 20px",
    textDecoration: "none",
    color: T.ink,
    border: `2px solid transparent`,
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: "24px 16px",
      }}
    >
      <div style={{ width: "100%", maxWidth: 420 }}>
        <div
          style={{
            background: T.kraft,
            borderRadius: 14,
            padding: "22px 20px",
            marginBottom: 14,
            backgroundImage:
              "repeating-linear-gradient(90deg, rgba(0,0,0,0.05) 0 2px, transparent 2px 9px)",
          }}
        >
          <span
            style={{
              display: "inline-block",
              background: "#fff",
              borderRadius: 8,
              padding: "6px 12px",
              fontSize: 26,
              fontWeight: 900,
              boxShadow: "2px 2px 0 rgba(0,0,0,0.15)",
            }}
          >
            종이길
          </span>
          <p
            style={{
              color: "#fff",
              fontSize: 14,
              lineHeight: 1.5,
              margin: "12px 0 0",
              fontWeight: 600,
            }}
          >
            폐지가 나온 곳을, 필요한 분께 — 헛걸음 없이 잇는 동네 지도
          </p>
        </div>

        <Link href="/store" style={{ ...card, marginBottom: 12 }}>
          <div style={{ fontSize: 20, fontWeight: 800 }}>점주 화면</div>
          <div style={{ fontSize: 14, color: T.gray, marginTop: 4 }}>
            폐지 사진을 올리면 AI가 양을 분석해 등록합니다
          </div>
        </Link>

        <Link href="/list" style={card}>
          <div style={{ fontSize: 20, fontWeight: 800 }}>어르신 화면</div>
          <div style={{ fontSize: 14, color: T.gray, marginTop: 4 }}>
            지금 근처에 나온 폐지를 확인하고 선점합니다
          </div>
        </Link>
      </div>
    </main>
  );
}
