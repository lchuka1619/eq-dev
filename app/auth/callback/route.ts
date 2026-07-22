import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

function safeNext(value: string | null) {
  return value?.startsWith("/") && !value.startsWith("//") ? value : "/";
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = safeNext(url.searchParams.get("next"));
  const client = await getSupabaseServerClient();

  if (code && client) {
    const { error } = await client.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, url.origin));
  }

  const errorUrl = new URL(next, url.origin);
  errorUrl.searchParams.set("auth_error", "callback");
  return NextResponse.redirect(errorUrl);
}
