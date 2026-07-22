"use client";

import { FormEvent, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useAuth } from "./auth-provider";

export function AuthModal() {
  const { authOpen, setAuthOpen, configured } = useAuth();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  if (!authOpen) return null;

  const callbackUrl = () => `${window.location.origin}/auth/callback?next=${encodeURIComponent(window.location.pathname)}`;

  const signInWithGoogle = async () => {
    const client = getSupabaseBrowserClient();
    if (!client) return;
    setBusy(true);
    setMessage("");
    const { error } = await client.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: callbackUrl() },
    });
    if (error) {
      setMessage(error.message);
      setBusy(false);
    }
  };

  const sendMagicLink = async (event: FormEvent) => {
    event.preventDefault();
    const client = getSupabaseBrowserClient();
    if (!client || !email.trim()) return;
    setBusy(true);
    setMessage("");
    const { error } = await client.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: callbackUrl() },
    });
    setBusy(false);
    setMessage(error ? error.message : "Нэвтрэх холбоосыг таны имэйл рүү илгээлээ.");
  };

  return (
    <div className="dialog-backdrop auth-backdrop" role="presentation" onMouseDown={() => setAuthOpen(false)}>
      <section className="auth-modal" role="dialog" aria-modal="true" aria-labelledby="auth-title" onMouseDown={(event) => event.stopPropagation()}>
        <button className="auth-close" type="button" onClick={() => setAuthOpen(false)} aria-label="Хаах">×</button>
        <p className="small-label">CLOUD PROGRESS</p>
        <h2 id="auth-title">Ахицаа бүх төхөөрөмждөө хадгалах</h2>
        <p>Нэвтрэхгүйгээр дасгал үргэлж ажиллана. Нэвтэрвэл энэ төхөөрөмжийн ахицыг account-тай тань алдагдалгүй нэгтгэнэ.</p>
        {!configured ? (
          <div className="auth-message error">Supabase тохиргоо байхгүй тул одоогоор зөвхөн энэ төхөөрөмжид хадгална.</div>
        ) : (
          <>
            <button className="auth-google" type="button" disabled={busy} onClick={signInWithGoogle}>Google-ээр үргэлжлүүлэх</button>
            <div className="auth-divider"><span>эсвэл</span></div>
            <form onSubmit={sendMagicLink}>
              <label htmlFor="auth-email">Имэйл</label>
              <input id="auth-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@example.com" required />
              <button className="primary-button" disabled={busy} type="submit">{busy ? "Түр хүлээнэ үү…" : "Magic link илгээх"}</button>
            </form>
          </>
        )}
        {message && <div className={`auth-message ${message.includes("илгээлээ") ? "success" : "error"}`}>{message}</div>}
        <small>Audio болон transcript cloud database-д хадгалахгүй.</small>
      </section>
    </div>
  );
}
