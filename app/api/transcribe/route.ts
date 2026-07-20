import { NextResponse } from "next/server";

type TranscribeRequest = { audio?: string; mimeType?: string };

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
            { text: "Энэ аудион дахь Монгол яриаг яг хэлснээр нь кирилл Монгол текст болгон буулга. Зөвхөн transcript бич. Орчуулахгүй, тайлбар нэмэхгүй." },
            { inlineData: { mimeType: body.mimeType || "audio/webm", data: body.audio } },
          ] }],
          generationConfig: { thinkingConfig: { thinkingBudget: 0 }, temperature: 0, maxOutputTokens: 300 },
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
    return NextResponse.json({ transcript: transcript.slice(0, 800) });
  } catch (error) {
    console.error("Transcription processing failed", error instanceof Error ? error.message : "unknown");
    return NextResponse.json({ error: "transcription_failed" }, { status: 502 });
  }
}
