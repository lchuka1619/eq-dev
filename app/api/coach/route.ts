import { NextResponse } from "next/server";

type CoachRequest = {
  coachLine?: string;
  response?: string;
  attempt?: "first" | "retry";
  previousResponse?: string;
};

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "gemini_not_configured" }, { status: 503 });
  }

  let body: CoachRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const response = body.response?.trim();
  if (!response || response.length > 800) {
    return NextResponse.json({ error: "invalid_response" }, { status: 400 });
  }

  const prompt = [
    "Та Монгол хэлээр ажилладаг харилцааны микро дасгалжуулагч.",
    "Хэрэглэгчийн хариултыг идэвхтэй сонсох чадвараар үнэл.",
    "Зөвлөгөө өгөхөөс өмнө утга ба мэдрэмжийг буцааж хэлсэн эсэх, нээлттэй асуулт тавьсан эсэхийг хар.",
    "Шүүмжлэлгүй, энгийн Монгол хэл хэрэглэ. Тус бүр хамгийн ихдээ 18 үгтэй байна.",
    `Яригчийн өгүүлбэр: ${body.coachLine ?? ""}`,
    `Хэрэглэгчийн ${body.attempt === "retry" ? "дахин хэлсэн" : "эхний"} хариулт: ${response}`,
    body.previousResponse ? `Өмнөх хариулт: ${body.previousResponse}` : "",
    'Зөвхөн {"positive":"...","improve":"..."} хэлбэрийн JSON буцаа.',
  ].filter(Boolean).join("\n");

  try {
    const geminiResponse = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema: {
              type: "OBJECT",
              required: ["positive", "improve"],
              properties: {
                positive: { type: "STRING" },
                improve: { type: "STRING" },
              },
            },
            thinkingConfig: { thinkingBudget: 0 },
            temperature: 0.35,
            maxOutputTokens: 512,
          },
        }),
        signal: AbortSignal.timeout(15000),
      },
    );

    if (!geminiResponse.ok) {
      const details = (await geminiResponse.text()).slice(0, 500);
      console.error("Gemini API request failed", geminiResponse.status, details);
      return NextResponse.json(
        { error: "gemini_upstream_error", upstreamStatus: geminiResponse.status },
        { status: 502 },
      );
    }

    const data = await geminiResponse.json() as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error("empty_response");

    const cleanText = text.replace(/^\`\`\`(?:json)?\s*/i, "").replace(/\s*\`\`\`$/, "");
    const feedback = JSON.parse(cleanText) as { positive?: string; improve?: string };
    if (!feedback.positive || !feedback.improve) throw new Error("invalid_feedback");

    return NextResponse.json({
      feedback: {
        positive: feedback.positive.slice(0, 240),
        improve: feedback.improve.slice(0, 240),
      },
      source: "gemini",
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "unknown_error";
    console.error("Gemini coach processing failed", reason);
    return NextResponse.json({ error: "gemini_processing_error" }, { status: 502 });
  }
}
