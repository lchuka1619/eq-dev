import { NextResponse } from "next/server";

type TranscribeRequest = { audio?: string; mimeType?: string };

function looksHallucinated(text: string) {
  const cleaned = text.replace(/\s+/g, " ").trim();
  const words = cleaned.toLocaleLowerCase("mn-MN").match(/[а-яөүё]+/gi) ?? [];
  if (cleaned.includes("[ТОДОРХОЙГҮЙ]") || cleaned.length > 320) return true;
  if (words.length < 24) return false;
  return new Set(words).size / words.length < 0.48;
}

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "gemini_not_configured" }, { status: 503 });

  try {
    const body = await request.json() as TranscribeRequest;
    if (!body.audio || body.audio.length > 6_000_000) {
      return NextResponse.json({ error: "invalid_audio" }, { status: 400 });
    }
    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify({
          contents: [{ parts: [
            { text: "12 секундээс богино энэ аудион дахь Монгол яриаг үгчлэн кириллээр буулга. Зөвхөн сонсогдсон үгийг бич. Сэдэв, өгүүлбэр, нэр томьёо огт таамаглаж зохиож болохгүй. Давталт нэмж болохгүй. Яриа тодорхой сонсогдохгүй эсвэл зөвхөн чимээ байвал яг [ТОДОРХОЙГҮЙ] гэж хариул. Зөвхөн transcript бич; тайлбар, орчуулга бүү нэм." },
            { inlineData: { mimeType: body.mimeType || "audio/webm", data: body.audio } },
          ] }],
          generationConfig: { thinkingConfig: { thinkingBudget: 0 }, temperature: 0, maxOutputTokens: 120 },
        }),
        signal: AbortSignal.timeout(20000),
      },
    );
    if (!response.ok) {
      console.error("Gemini transcription failed", response.status, (await response.text()).slice(0, 400));
      return NextResponse.json({ error: "transcription_upstream_error" }, { status: 502 });
    }
    const data = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
    const transcript = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!transcript) return NextResponse.json({ error: "empty_transcript" }, { status: 502 });
    if (looksHallucinated(transcript)) {
      return NextResponse.json({ error: "unclear_audio" }, { status: 422 });
    }
    return NextResponse.json({ transcript: transcript.slice(0, 320) });
  } catch (error) {
    console.error("Transcription processing failed", error instanceof Error ? error.message : "unknown");
    return NextResponse.json({ error: "transcription_failed" }, { status: 502 });
  }
}
