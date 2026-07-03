"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase, isConfigured } from "../../lib/supabase";
import { T, PRICE_PER_KG, fmt } from "../../lib/theme";

const CLAIM_MINUTES = 30;

export default function ListPage() {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState(false);
  const [tick, setTick] = useState(Date.now());

  const load = async () => {
    const { data, error } = await supabase
      .from("listings")
      .select("*")
      .neq("status", "taken")
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) {
      console.error(error);
      setDbError(true);
    } else {
      setListings(data || []);
      setDbError(false);
    }
    setLoading(false);
  };

  // 최초 로드 + 8초 폴링 (점주 등록이 곧바로 반영되도록)
  useEffect(() => {
    load();
    const t = setInterval(() => {
      load();
      setTick(Date.now());
    }, 8000);
    return () => clearInterval(t);
  }, []);

  const isClaimed = (l) =>
    l.status === "claimed" &&
    l.claimed_until &&
    new Date(l.claimed_until).getTime() > tick;

  const minutesLeft = (l) =>
    Math.max(0, Math.ceil((new Date(l.claimed_until).getTime() - tick) / 60000));

  const claim = async (id) => {
    const until = new Date(Date.now() + CLAIM_MINUTES * 60000).toISOString();
    await supabase
      .from("listings")
      .update({ status: "claimed", claimed_until: until })
      .eq("id", id);
    load();
  };

  const taken = async (id) => {
    await supabase.from("listings").update({ status: "taken" }).eq("id", id);
    load();
  };

  const availableCount = listings.filter((l) => !isClaimed(l)).length;

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
        <Header sub="어르신 화면" />
        <div
          style={{
            background: "#fff",
            borderRadius: "0 0 14px 14px",
            padding: "18px 16px 32px",
            minHeight: 520,
          }}
        >
          {loading ? (
            <p style={{ fontSize: 20, color: T.gray, textAlign: "center" }}>
              불러오는 중…
            </p>
          ) : dbError ? (
            <div
              style={{
                padding: "30px 20px",
                textAlign: "center",
                fontSize: 17,
                color: T.orange,
                background: T.orangeBg,
                borderRadius: 14,
                lineHeight: 1.6,
              }}
            >
              {isConfigured()
                ? "목록을 불러오지 못했어요. 잠시 후 다시 열어 주세요."
                : "데이터베이스가 아직 연결되지 않았어요 (환경변수 설정 필요)."}
            </div>
          ) : (
            <>
              <p
                style={{
                  fontSize: 20,
                  fontWeight: 700,
                  margin: "0 0 16px",
                  lineHeight: 1.4,
                }}
              >
                지금 근처에{" "}
                <span style={{ color: T.green }}>폐지 {availableCount}곳</span>
                이 있어요
              </p>

              {listings.length === 0 && (
                <div
                  style={{
                    padding: "40px 20px",
                    textAlign: "center",
                    fontSize: 20,
                    color: T.gray,
                    background: T.grayBg,
                    borderRadius: 14,
                    lineHeight: 1.5,
                  }}
                >
                  지금은 나온 폐지가 없어요.
                  <br />
                  새로 나오면 여기에 떠요.
                </div>
              )}

              {listings.map((l) => {
                const claimed = isClaimed(l);
                return (
                  <div
                    key={l.id}
                    style={{
                      border: `2px solid ${claimed ? T.line : T.green}`,
                      borderRadius: 14,
                      marginBottom: 16,
                      overflow: "hidden",
                      background: "#fff",
                      opacity: claimed ? 0.85 : 1,
                    }}
                  >
                    <div
                      style={{
                        background: claimed ? T.grayBg : T.greenBg,
                        color: claimed ? T.gray : T.green,
                        fontSize: 22,
                        fontWeight: 800,
                        padding: "10px 16px",
                      }}
                    >
                      {claimed
                        ? `다른 분이 가는 중 · ${minutesLeft(l)}분 남음`
                        : "있음"}
                    </div>

                    <div style={{ padding: "14px 16px" }}>
                      <div
                        style={{ fontSize: 26, fontWeight: 800, lineHeight: 1.3 }}
                      >
                        {l.store}
                      </div>
                      <div style={{ fontSize: 19, marginTop: 2 }}>{l.addr}</div>

                      <div
                        style={{
                          display: "flex",
                          gap: 10,
                          marginTop: 12,
                          flexWrap: "wrap",
                        }}
                      >
                        <div
                          style={{
                            background: T.field,
                            borderRadius: 10,
                            padding: "10px 14px",
                            fontSize: 22,
                            fontWeight: 800,
                          }}
                        >
                          약 {l.kg}kg
                        </div>
                        <div
                          style={{
                            background: T.field,
                            borderRadius: 10,
                            padding: "10px 14px",
                            fontSize: 22,
                            fontWeight: 800,
                            color: T.green,
                          }}
                        >
                          약 {fmt(l.kg * PRICE_PER_KG)}원
                        </div>
                      </div>
                      <div style={{ fontSize: 17, color: T.gray, marginTop: 8 }}>
                        {l.items}
                        {l.note ? ` · ${l.note}` : ""}
                      </div>

                      {!claimed ? (
                        <button
                          onClick={() => claim(l.id)}
                          style={{
                            width: "100%",
                            marginTop: 14,
                            height: 68,
                            borderRadius: 12,
                            border: "none",
                            background: T.orange,
                            color: "#fff",
                            fontSize: 24,
                            fontWeight: 800,
                            cursor: "pointer",
                          }}
                        >
                          제가 갈게요
                        </button>
                      ) : (
                        <button
                          onClick={() => taken(l.id)}
                          style={{
                            width: "100%",
                            marginTop: 14,
                            height: 56,
                            borderRadius: 12,
                            border: `2px solid ${T.line}`,
                            background: "#fff",
                            color: T.gray,
                            fontSize: 19,
                            fontWeight: 700,
                            cursor: "pointer",
                          }}
                        >
                          가져갔어요 (목록에서 지우기)
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

              <p
                style={{
                  fontSize: 15,
                  color: T.gray,
                  lineHeight: 1.6,
                  marginTop: 8,
                }}
              >
                &lsquo;제가 갈게요&rsquo;를 누르면 {CLAIM_MINUTES}분 동안 다른 분
                화면에 &lsquo;가는 중&rsquo;으로 표시돼요. 서로 헛걸음하지
                않도록요.
              </p>
            </>
          )}
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
      <Link href="/" style={{ color: "#fff", fontSize: 13, fontWeight: 700 }}>
        처음으로
      </Link>
    </div>
  );
}
