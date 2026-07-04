"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { supabase, isConfigured } from "../../lib/supabase";
import { T, PRICE_PER_KG, PRICE_SOURCE, fmt, DEMO_STORES } from "../../lib/theme";

// 사진을 캔버스로 축소해 용량을 줄입니다 (긴 변 900px, JPEG)
function resizeImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const max = 900;
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
      URL.revokeObjectURL(url);
      resolve(dataUrl);
    };
    img.onerror = reject;
    img.src = url;
  });
}

export default function StorePage() {
  const [storeId, setStoreId] = useState(1);
  const [photo, setPhoto] = useState(null); // dataURL
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState(null); // {kg, items, note}
  const [error, setError] = useState(null);
  const [publishing, setPublishing] = useState(false);
  const [published, setPublished] = useState(false);
  const fileRef = useRef(null);

  const store = DEMO_STORES.find((s) => s.id === Number(storeId));

  const handleFile = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setError(null);
    setResult(null);
    setPublished(false);
    try {
      const dataUrl = await resizeImage(file);
      setPhoto(dataUrl);
    } catch {
      setError("사진을 불러오지 못했어요. 다른 사진으로 시도해 주세요.");
    }
  };

  const analyze = async () => {
    if (!photo) return;
    setAnalyzing(true);
    setError(null);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: photo.split(",")[1],
          mediaType: "image/jpeg",
        }),
      });
      if (!res.ok) throw new Error("analyze failed");
      const parsed = await res.json();
      setResult({
        kg: Math.max(0, Math.round(parsed.estimated_kg)),
        items: parsed.items || "종이박스",
        note: parsed.note || "",
      });
    } catch (err) {
      console.error(err);
      setError("AI 분석에 실패했어요. 잠시 후 다시 시도해 주세요.");
    }
    setAnalyzing(false);
  };

  const publish = async () => {
    if (!result || !store) return;
    setPublishing(true);
    setError(null);
    const { error: dbError } = await supabase.from("listings").insert({
      store: store.name,
      addr: store.addr,
      kg: result.kg,
      items: result.items,
      note: result.note,
      status: "available",
    });
    setPublishing(false);
    if (dbError) {
      console.error(dbError);
      setError(
        isConfigured()
          ? "등록에 실패했어요. 잠시 후 다시 시도해 주세요."
          : "데이터베이스가 아직 연결되지 않았어요 (환경변수 설정 필요)."
      );
      return;
    }
    setPublished(true);
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        padding: "24px 12px",
      }}
    >
      <div style={{ width: "100%", maxWidth: 420 }}>
        <Header sub="점주 화면" />
        <div
          style={{
            background: "#fff",
            borderRadius: "0 0 14px 14px",
            padding: "20px 18px 32px",
            minHeight: 520,
          }}
        >
          {/* QR 스캔 확인 배너 — 실서비스에서는 QR의 id로 자동 결정 */}
          <div
            style={{
              background: T.field,
              border: `1.5px dashed ${T.kraftDeep}`,
              borderRadius: 10,
              padding: "12px 14px",
              marginBottom: 20,
            }}
          >
            <div style={{ fontSize: 13, color: T.gray, fontWeight: 600 }}>
              QR 스캔 완료 · 위치 자동 등록 (데모: 점포 선택)
            </div>
            <select
              value={storeId}
              onChange={(e) => setStoreId(e.target.value)}
              style={{
                marginTop: 6,
                width: "100%",
                fontSize: 15,
                fontWeight: 700,
                padding: "8px 10px",
                borderRadius: 8,
                border: `1px solid ${T.line}`,
                background: "#fff",
              }}
            >
              {DEMO_STORES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} — {s.addr}
                </option>
              ))}
            </select>
          </div>

          <h2 style={{ fontSize: 19, fontWeight: 800, margin: "0 0 6px" }}>
            폐지 배출 등록
          </h2>
          <p
            style={{
              fontSize: 14,
              color: T.gray,
              margin: "0 0 16px",
              lineHeight: 1.5,
            }}
          >
            사진 한 장이면 끝나요. AI가 양을 추정해 어르신들께 알려드립니다.
          </p>

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={handleFile}
            style={{ display: "none" }}
          />

          {!photo ? (
            <button
              onClick={() => fileRef.current && fileRef.current.click()}
              style={{
                width: "100%",
                height: 150,
                borderRadius: 12,
                border: `2px dashed ${T.kraft}`,
                background: "#FBF9F4",
                color: T.kraftDeep,
                fontSize: 16,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              📷 배출한 폐지 사진 올리기
            </button>
          ) : (
            <div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo}
                alt="배출한 폐지"
                style={{
                  width: "100%",
                  maxHeight: 220,
                  objectFit: "cover",
                  borderRadius: 12,
                  border: `1px solid ${T.line}`,
                  display: "block",
                }}
              />
              <button
                onClick={() => fileRef.current && fileRef.current.click()}
                style={{
                  marginTop: 8,
                  background: "none",
                  border: "none",
                  color: T.gray,
                  fontSize: 13,
                  textDecoration: "underline",
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                사진 다시 선택
              </button>
            </div>
          )}

          {photo && !result && (
            <button
              onClick={analyze}
              disabled={analyzing}
              style={{
                width: "100%",
                marginTop: 14,
                height: 52,
                borderRadius: 10,
                border: "none",
                background: analyzing ? T.gray : T.ink,
                color: "#fff",
                fontSize: 16,
                fontWeight: 700,
                cursor: analyzing ? "default" : "pointer",
              }}
            >
              {analyzing ? "AI가 사진을 분석하는 중…" : "AI로 폐지 양 분석하기"}
            </button>
          )}

          {error && (
            <div
              style={{
                marginTop: 12,
                padding: "10px 12px",
                background: T.orangeBg,
                color: T.orange,
                borderRadius: 8,
                fontSize: 14,
              }}
            >
              {error}
            </div>
          )}

          {result && (
            <div
              style={{
                marginTop: 16,
                borderRadius: 12,
                border: `1px solid ${T.line}`,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  background: T.kraft,
                  color: "#fff",
                  fontSize: 13,
                  fontWeight: 700,
                  padding: "8px 14px",
                  letterSpacing: "0.05em",
                }}
              >
                AI 분석 결과
              </div>
              <div style={{ padding: "14px 16px", background: "#FDFCF9" }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                  <span style={{ fontSize: 32, fontWeight: 800 }}>
                    약 {result.kg}kg
                  </span>
                  <span
                    style={{ fontSize: 16, color: T.green, fontWeight: 700 }}
                  >
                    예상 {fmt(result.kg * PRICE_PER_KG)}원
                  </span>
                </div>
                <div style={{ fontSize: 14, marginTop: 6 }}>
                  품목: {result.items}
                </div>
                {result.note && (
                  <div style={{ fontSize: 13, color: T.gray, marginTop: 4 }}>
                    {result.note}
                  </div>
                )}
                <div style={{ fontSize: 11.5, color: T.gray, marginTop: 8 }}>
                  {PRICE_SOURCE}
                </div>
              </div>
              {!published ? (
                <button
                  onClick={publish}
                  disabled={publishing}
                  style={{
                    width: "100%",
                    height: 54,
                    border: "none",
                    background: publishing ? T.gray : T.green,
                    color: "#fff",
                    fontSize: 17,
                    fontWeight: 800,
                    cursor: publishing ? "default" : "pointer",
                  }}
                >
                  {publishing ? "등록하는 중…" : "이 내용으로 배출 알리기"}
                </button>
              ) : (
                <div
                  style={{
                    padding: "14px 16px",
                    background: T.greenBg,
                    color: T.green,
                    fontSize: 15,
                    fontWeight: 700,
                    textAlign: "center",
                  }}
                >
                  ✓ 등록 완료 — 어르신 화면에서 확인해 보세요
                </div>
              )}
            </div>
          )}

          <p
            style={{
              fontSize: 12.5,
              color: T.gray,
              marginTop: 20,
              lineHeight: 1.6,
            }}
          >
            점주님께 좋은 점 — 지정 지점에 내놓은 폐지가 빠르게 수거되어, 봉투가
            찢기거나 가게 앞이 어질러지는 일이 줄어듭니다.
          </p>
        </div>
      </div>
    </main>
  );
}

function Header({ sub }) {
  return (
    <div
      style={{
        background: T.kraft,
        borderRadius: "14px 14px 0 0",
        padding: "14px 18px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundImage:
          "repeating-linear-gradient(90deg, rgba(0,0,0,0.05) 0 2px, transparent 2px 9px)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span
          style={{
            background: "#fff",
            borderRadius: 8,
            padding: "4px 8px",
            fontSize: 18,
            fontWeight: 900,
            boxShadow: "2px 2px 0 rgba(0,0,0,0.15)",
          }}
        >
          종이길
        </span>
        <span style={{ color: "#fff", fontSize: 14, fontWeight: 700 }}>
          {sub}
        </span>
      </div>
      <Link
        href="/"
        style={{ color: "#fff", fontSize: 13, fontWeight: 700 }}
      >
        처음으로
      </Link>
    </div>
  );
}
