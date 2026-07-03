// 서버 함수 — API 키가 브라우저에 노출되지 않도록 사진 분석은 여기서 수행합니다.
// Vercel 환경변수 ANTHROPIC_API_KEY 필요.

export async function POST(req) {
  try {
    const { image, mediaType } = await req.json();
    if (!image) {
      return Response.json({ error: "no image" }, { status: 400 });
    }
    if (!process.env.ANTHROPIC_API_KEY) {
      return Response.json(
        { error: "ANTHROPIC_API_KEY not set" },
        { status: 500 }
      );
    }

    const prompt =
      "이 사진은 가게 앞에 배출된 재활용 폐지(종이박스 등)입니다. " +
      "폐지 수집 어르신이 '가볼 가치가 있는지' 판단할 수 있도록 분석해 주세요. " +
      "다음 JSON 형식으로만 답하세요. 마크다운이나 다른 텍스트 없이 순수 JSON만: " +
      '{"estimated_kg": 숫자, "items": "품목을 쉼표로 나열 (예: 종이박스, 신문지)", ' +
      '"note": "수거 난이도나 상태에 대한 한 줄 메모 (예: 납작하게 접혀 있어 옮기기 쉬움)"} ' +
      "무게는 보이는 박스의 개수와 크기를 근거로 보수적으로 추정하세요. " +
      "사진에 폐지가 없으면 estimated_kg를 0으로 하세요.";

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 500,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: mediaType || "image/jpeg",
                  data: image,
                },
              },
              { type: "text", text: prompt },
            ],
          },
        ],
      }),
    });

    if (!res.ok) {
      const detail = await res.text();
      console.error("Anthropic API error:", detail);
      return Response.json({ error: "api error" }, { status: 502 });
    }

    const data = await res.json();
    const text = (data.content || [])
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("\n");
    const clean = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);

    return Response.json({
      estimated_kg: Number(parsed.estimated_kg) || 0,
      items: parsed.items || "종이박스",
      note: parsed.note || "",
    });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "server error" }, { status: 500 });
  }
}
