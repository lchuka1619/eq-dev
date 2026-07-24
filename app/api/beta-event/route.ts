import { NextResponse } from "next/server";
import {
  LEARNING_EVENT_NAMES,
  sanitizeLearningProperties,
} from "@/lib/analytics/learning-events";

const allowedEvents = new Set([
  "arena_started",
  "scene_audio_played",
  "response_recorded",
  "transcript_confirmed",
  "feedback_shown",
  "retry_completed",
  "control_used",
  "arena_completed",
  "beta_feedback_submitted",
  ...LEARNING_EVENT_NAMES,
]);

type BetaEventRequest = {
  event?: string;
  anonymousId?: string;
  sessionId?: string;
  properties?: Record<string, string | number | boolean | null>;
};

function sanitizeProperties(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const entries = Object.entries(value as Record<string, unknown>).slice(0, 20);
  return Object.fromEntries(entries.flatMap(([key, item]) => {
    if (!/^[a-zA-Z0-9_]{1,40}$/.test(key)) return [];
    if (["string", "number", "boolean"].includes(typeof item) || item === null) {
      return [[key, typeof item === "string" ? item.slice(0, 120) : item]];
    }
    return [];
  }));
}

export async function POST(request: Request) {
  try {
    const contentLength = Number(request.headers.get("content-length") ?? 0);
    if (contentLength > 8_000) return NextResponse.json({ error: "payload_too_large" }, { status: 413 });

    const body = await request.json() as BetaEventRequest;
    if (!body.event || !allowedEvents.has(body.event)) {
      return NextResponse.json({ error: "invalid_event" }, { status: 400 });
    }
    if (!body.anonymousId || !/^[a-zA-Z0-9-]{8,80}$/.test(body.anonymousId)) {
      return NextResponse.json({ error: "invalid_anonymous_id" }, { status: 400 });
    }

    const learningEvent = (LEARNING_EVENT_NAMES as readonly string[]).includes(body.event);
    const record = {
      event: body.event,
      anonymousId: body.anonymousId,
      sessionId: learningEvent
        ? (typeof body.sessionId === "string" && /^[a-zA-Z0-9-]{8,80}$/.test(body.sessionId) ? body.sessionId : "")
        : (typeof body.sessionId === "string" ? body.sessionId.slice(0, 80) : ""),
      properties: learningEvent
        ? sanitizeLearningProperties(body.properties)
        : sanitizeProperties(body.properties),
      receivedAt: new Date().toISOString(),
    };

    // Vercel Functions logs provide the first centralized beta telemetry store.
    // No audio or transcript is accepted by this endpoint.
    console.info("EQ_BETA_EVENT", JSON.stringify(record));
    return NextResponse.json({ accepted: true });
  } catch {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }
}
