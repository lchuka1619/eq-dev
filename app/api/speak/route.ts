import { NextResponse } from "next/server";

function pcmToWavBase64(pcmBase64: string) {
  const pcm = Buffer.from(pcmBase64, "base64");
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(24000, 24);
  header.writeUInt32LE(48000, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36);
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]).toString("base64");
}

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "gemini_not_configured" }, { status: 503 });

  try {
    const body = await request.json() as { text?: string };
    const text = body.text?.trim();
    if (!text || text.length > 500) return NextResponse.json({ error: "invalid_text" }, { status: 400 });

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-tts-preview:generateContent",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `Монгол хэлээр тайван, ойлгомжтой, ялимгүй удаан унш: ${text}` }] }],
          generationConfig: {
            responseModalities: ["AUDIO"],
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: "Kore" } } },
          },
        }),
        signal: AbortSignal.timeout(20000),
      },
    );
    if (!response.ok) {
      console.error("Gemini TTS failed", response.status, (await response.text()).slice(0, 400));
      return NextResponse.json({ error: "tts_upstream_error" }, { status: 502 });
    }
    const data = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ inlineData?: { data?: string; mimeType?: string } }> } }> };
    const inlineData = data.candidates?.[0]?.content?.parts?.[0]?.inlineData;
    if (!inlineData?.data) return NextResponse.json({ error: "empty_audio" }, { status: 502 });
    const isPcm = !inlineData.mimeType || inlineData.mimeType.includes("L16") || inlineData.mimeType.includes("pcm");
    return NextResponse.json({
      audio: isPcm ? pcmToWavBase64(inlineData.data) : inlineData.data,
      mimeType: isPcm ? "audio/wav" : inlineData.mimeType,
    });
  } catch (error) {
    console.error("TTS processing failed", error instanceof Error ? error.message : "unknown");
    return NextResponse.json({ error: "tts_failed" }, { status: 502 });
  }
}
