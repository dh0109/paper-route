// 서버 함수 — 티맵 보행자 경로 API로 실경로 거리(m)를 조회합니다.
// 키(TMAP_APP_KEY)는 서버에만 존재하며 브라우저에 노출되지 않습니다.
// 키 미설정/호출 실패 시 클라이언트는 직선거리×보정계수로 자동 폴백합니다.

export async function POST(req) {
  try {
    const { sx, sy, ex, ey } = await req.json(); // s=출발(어르신), e=도착(배출지), x=경도 y=위도
    if ([sx, sy, ex, ey].some((v) => typeof v !== "number")) {
      return Response.json({ error: "bad coords" }, { status: 400 });
    }
    if (!process.env.TMAP_APP_KEY) {
      // 키가 아직 없으면 폴백하라고 알려줌 (에러가 아니라 정상 분기)
      return Response.json({ fallback: true }, { status: 200 });
    }

    const res = await fetch(
      "https://apis.openapi.sk.com/tmap/routes/pedestrian?version=1",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          appKey: process.env.TMAP_APP_KEY,
        },
        body: JSON.stringify({
          startX: String(sx),
          startY: String(sy),
          endX: String(ex),
          endY: String(ey),
          startName: encodeURIComponent("출발"),
          endName: encodeURIComponent("도착"),
        }),
      }
    );

    if (!res.ok) {
      console.error("Tmap error:", res.status, await res.text());
      return Response.json({ fallback: true }, { status: 200 });
    }

    const data = await res.json();
    // 응답의 첫 feature properties에 totalDistance(m)가 담겨 있음
    const meters =
      data?.features?.[0]?.properties?.totalDistance ??
      data?.features?.find((f) => f?.properties?.totalDistance)?.properties
        ?.totalDistance;

    if (!meters || meters <= 0) {
      return Response.json({ fallback: true }, { status: 200 });
    }
    return Response.json({ meters });
  } catch (err) {
    console.error(err);
    return Response.json({ fallback: true }, { status: 200 });
  }
}
