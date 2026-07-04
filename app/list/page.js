"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase, isConfigured } from "../../lib/supabase";
import {
  T,
  PRICE_PER_KG,
  PRICE_SOURCE,
  fmt,
  DEMO_STORES,
  cartMinutes,
  CART_SPEED_KMH,
  MAX_CLAIM_MINUTES,
} from "../../lib/theme";

export default function ListPage() {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState(false);
  const [tick, setTick] = useState(Date.now());
  const [userPos, setUserPos] = useState(null); // {lat, lng} | "denied" | null(대기중)
  const [myClaim, setMyClaim] = useState(null); // {id, until}
  const [routeMeters, setRouteMeters] = useState({}); // 가게명 → 실경로 거리(m)

  // 위치 확보 시 각 배출지까지 실경로 거리 조회 (실패 시 해당 가게는 직선 폴백)
  useEffect(() => {
    if (!userPos || userPos === "denied") return;
    let cancelled = false;
    (async () => {
      for (const s of DEMO_STORES) {
        try {
          const res = await fetch("/api/route", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              sx: userPos.lng,
              sy: userPos.lat,
              ex: s.lng,
              ey: s.lat,
            }),
          });
          const data = await res.json();
          if (!cancelled && data.meters) {
            setRouteMeters((prev) => ({ ...prev, [s.name]: data.meters }));
          }
        } catch {}
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userPos]);

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

  // 최초 로드 + 8초 폴링
  useEffect(() => {
    load();
    // 이 기기에서 진행 중인 선점 복원
    try {
      const saved = JSON.parse(localStorage.getItem("myClaim") || "null");
      if (saved && saved.until > Date.now()) setMyClaim(saved);
      else localStorage.removeItem("myClaim");
    } catch {}
    // 위치 권한 (거부해도 서비스는 동네 목록으로 계속 작동)
    if (typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (p) => setUserPos({ lat: p.coords.latitude, lng: p.coords.longitude }),
        () => setUserPos("denied"),
        { enableHighAccuracy: false, timeout: 8000 }
      );
    } else {
      setUserPos("denied");
    }
    const t = setInterval(() => {
      load();
      setTick(Date.now());
    }, 8000);
    return () => clearInterval(t);
  }, []);

  const storeCoord = (l) => DEMO_STORES.find((s) => s.name === l.store);

  // 리어카 기준 예상 이동 시간(분)
  // 1순위: 실경로 거리(티맵 보행자 경로) ÷ 리어카 속도
  // 2순위(폴백): 직선거리 × 우회계수 ÷ 리어카 속도
  const travelMin = (l) => {
    const s = storeCoord(l);
    if (!userPos || userPos === "denied" || !s) return null;
    const m = routeMeters[l.store];
    if (m) return Math.max(1, Math.round((m / 1000 / CART_SPEED_KMH) * 60));
    return cartMinutes(userPos.lat, userPos.lng, s.lat, s.lng);
  };

  const isClaimed = (l) =>
    l.status === "claimed" &&
    l.claimed_until &&
    new Date(l.claimed_until).getTime() > tick;

  const minutesLeft = (l) =>
    Math.max(0, Math.ceil((new Date(l.claimed_until).getTime() - tick) / 60000));

  const isMine = (l) => myClaim && myClaim.id === l.id && myClaim.until > tick;
  const hasActiveClaim = myClaim && myClaim.until > tick;

  const [notice, setNotice] = useState(null); // 상단 안내 (선점 경합 등)
  const [confirmingId, setConfirmingId] = useState(null); // 도착 확인 진행 중인 항목

  const claim = async (l) => {
    // 선점 시간 = 예상 이동시간 + 여유 10분 (15~40분).
    // 위치 미허용 시에는 최소값 15분만 부여 — 원거리 차단(25분 컷)을
    // 위치 거부로 우회하는 악용의 이득을 제거하되, 가까운 곳의 실사용은 보장.
    const t = travelMin(l);
    const minutes = t == null ? 15 : Math.min(45, Math.max(15, t + 10));
    const untilMs = Date.now() + minutes * 60000;
    const nowIso = new Date().toISOString();
    // 경쟁 조건 방지: '아직 선점 가능일 때만' 변경하라는 조건을 DB가 판정.
    // (available이거나, claimed지만 시간이 만료된 경우에만 성공)
    const { data, error } = await supabase
      .from("listings")
      .update({
        status: "claimed",
        claimed_until: new Date(untilMs).toISOString(),
      })
      .eq("id", l.id)
      .or(`status.eq.available,and(status.eq.claimed,claimed_until.lt.${nowIso})`)
      .select();
    if (error || !data || data.length === 0) {
      // 다른 분이 밀리초 차이로 먼저 선점한 경우
      setNotice("방금 다른 분이 먼저 선점하셨어요. 다른 곳을 확인해 보세요.");
      setTimeout(() => setNotice(null), 5000);
      load();
      return;
    }
    const mine = { id: l.id, until: untilMs };
    setMyClaim(mine);
    try {
      localStorage.setItem("myClaim", JSON.stringify(mine));
    } catch {}
    load();
  };

  const taken = async (id) => {
    await supabase.from("listings").update({ status: "taken" }).eq("id", id);
    setConfirmingId(null);
    if (myClaim && myClaim.id === id) {
      setMyClaim(null);
      try {
        localStorage.removeItem("myClaim");
      } catch {}
    }
    load();
  };

  const openDirections = (l) => {
    const s = storeCoord(l);
    if (!s) return;
    // 카카오맵 앱: 도보 경로 (앱이 없으면 아래 웹 지도로 폴백)
    const appUrl = `kakaomap://route?ep=${s.lat},${s.lng}&by=FOOT`;
    const webUrl = `https://map.kakao.com/link/to/${encodeURIComponent(
      l.store
    )},${s.lat},${s.lng}`;
    const start = Date.now();
    window.location.href = appUrl;
    setTimeout(() => {
      // 앱 전환이 일어나지 않았으면 웹 지도 열기
      if (Date.now() - start < 1600) window.open(webUrl, "_blank");
    }, 1200);
  };

  const availableCount = listings.filter((l) => !isClaimed(l)).length;

  // 가까운 순 정렬 (위치 있을 때만), 없으면 최신순 유지
  const sorted = [...listings].sort((a, b) => {
    const ta = travelMin(a);
    const tb = travelMin(b);
    if (ta == null || tb == null) return 0;
    return ta - tb;
  });

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
                  margin: "0 0 6px",
                  lineHeight: 1.4,
                }}
              >
                지금 근처에{" "}
                <span style={{ color: T.green }}>폐지 {availableCount}곳</span>
                이 있어요
              </p>
              <p style={{ fontSize: 14, color: T.gray, margin: "0 0 16px" }}>
                {userPos && userPos !== "denied"
                  ? Object.keys(routeMeters).length > 0
                    ? "가까운 곳부터 · 실제 길 기준, 리어카 속도로 계산한 시간이에요"
                    : "가까운 곳부터 보여드려요 · 시간은 리어카 기준이에요"
                  : "위치를 허용하시면 걸리는 시간을 알려드려요"}
              </p>

              {notice && (
                <div
                  style={{
                    padding: "12px 14px",
                    marginBottom: 14,
                    borderRadius: 10,
                    background: T.orangeBg,
                    color: T.orange,
                    fontSize: 16,
                    fontWeight: 700,
                    lineHeight: 1.4,
                  }}
                >
                  {notice}
                </div>
              )}

              {sorted.length === 0 && (
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

              {sorted.map((l) => {
                const mine = isMine(l);
                const claimed = isClaimed(l) && !mine;
                const t = travelMin(l);
                const tooFar = t != null && t > MAX_CLAIM_MINUTES;
                return (
                  <div
                    key={l.id}
                    style={{
                      border: `2px solid ${
                        mine ? T.orange : claimed ? T.line : T.green
                      }`,
                      borderRadius: 14,
                      marginBottom: 16,
                      overflow: "hidden",
                      background: "#fff",
                      opacity: claimed ? 0.85 : 1,
                    }}
                  >
                    <div
                      style={{
                        background: mine
                          ? T.orangeBg
                          : claimed
                          ? T.grayBg
                          : T.greenBg,
                        color: mine ? T.orange : claimed ? T.gray : T.green,
                        fontSize: 22,
                        fontWeight: 800,
                        padding: "10px 16px",
                      }}
                    >
                      {mine
                        ? `내가 가는 중 · ${minutesLeft(l)}분 남음`
                        : claimed
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
                        {t != null && (
                          <div
                            style={{
                              background: T.ink,
                              color: "#fff",
                              borderRadius: 10,
                              padding: "10px 14px",
                              fontSize: 22,
                              fontWeight: 800,
                            }}
                          >
                            리어카 약 {t}분
                          </div>
                        )}
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

                      <button
                        onClick={() => openDirections(l)}
                        style={{
                          width: "100%",
                          marginTop: 12,
                          height: 56,
                          borderRadius: 12,
                          border: `2px solid ${T.ink}`,
                          background: "#fff",
                          color: T.ink,
                          fontSize: 20,
                          fontWeight: 800,
                          cursor: "pointer",
                        }}
                      >
                        🧭 길 찾기 (지도 열기)
                      </button>

                      {mine ? (
                        confirmingId === l.id ? (
                          <div
                            style={{
                              marginTop: 14,
                              padding: "14px",
                              borderRadius: 12,
                              background: T.orangeBg,
                              textAlign: "center",
                            }}
                          >
                            <div
                              style={{
                                fontSize: 16,
                                fontWeight: 700,
                                color: T.orange,
                                lineHeight: 1.5,
                                marginBottom: 10,
                              }}
                            >
                              현장에 붙은 QR을 찍어 도착을 확인합니다
                              <br />
                              <span style={{ fontSize: 13, fontWeight: 600 }}>
                                (데모에서는 아래 버튼으로 대신합니다)
                              </span>
                            </div>
                            <button
                              onClick={() => taken(l.id)}
                              style={{
                                width: "100%",
                                height: 60,
                                borderRadius: 12,
                                border: "none",
                                background: T.green,
                                color: "#fff",
                                fontSize: 20,
                                fontWeight: 800,
                                cursor: "pointer",
                              }}
                            >
                              도착 확인 · 수거 완료
                            </button>
                            <button
                              onClick={() => setConfirmingId(null)}
                              style={{
                                marginTop: 8,
                                background: "none",
                                border: "none",
                                color: T.gray,
                                fontSize: 14,
                                textDecoration: "underline",
                                cursor: "pointer",
                              }}
                            >
                              아직 도착 전이에요
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmingId(l.id)}
                            style={{
                              width: "100%",
                              marginTop: 14,
                              height: 68,
                              borderRadius: 12,
                              border: "none",
                              background: T.green,
                              color: "#fff",
                              fontSize: 24,
                              fontWeight: 800,
                              cursor: "pointer",
                            }}
                          >
                            가져왔어요 (완료)
                          </button>
                        )
                      ) : claimed ? (
                        <div
                          style={{
                            marginTop: 14,
                            padding: "14px",
                            borderRadius: 12,
                            background: T.grayBg,
                            color: T.gray,
                            fontSize: 18,
                            fontWeight: 700,
                            textAlign: "center",
                          }}
                        >
                          시간이 지나면 다시 열려요
                        </div>
                      ) : tooFar ? (
                        <div
                          style={{
                            marginTop: 14,
                            padding: "14px",
                            borderRadius: 12,
                            background: T.grayBg,
                            color: T.gray,
                            fontSize: 18,
                            fontWeight: 700,
                            textAlign: "center",
                            lineHeight: 1.4,
                          }}
                        >
                          여기서는 조금 멀어요 (약 {t}분)
                          <br />
                          가까운 분께 양보돼요
                        </div>
                      ) : hasActiveClaim ? (
                        <div
                          style={{
                            marginTop: 14,
                            padding: "14px",
                            borderRadius: 12,
                            background: T.orangeBg,
                            color: T.orange,
                            fontSize: 18,
                            fontWeight: 700,
                            textAlign: "center",
                            lineHeight: 1.4,
                          }}
                        >
                          지금 가시는 곳부터 다녀오세요
                          <br />
                          (한 번에 한 곳만 맡을 수 있어요)
                        </div>
                      ) : (
                        <button
                          onClick={() => claim(l)}
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
                &lsquo;제가 갈게요&rsquo;를 누르면 가시는 데 걸리는 시간만큼 다른
                분 화면에 &lsquo;가는 중&rsquo;으로 표시돼요. 서로 헛걸음하지
                않도록요.
              </p>
              <p style={{ fontSize: 12, color: T.gray, marginTop: 4 }}>
                {PRICE_SOURCE}
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
