"use client";

import type { Session, User } from "@supabase/supabase-js";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { SyncState } from "@/lib/supabase/types";

type AuthContextValue = {
  configured: boolean;
  loading: boolean;
  session: Session | null;
  user: User | null;
  authOpen: boolean;
  setAuthOpen: (open: boolean) => void;
  authError: string | null;
  clearAuthError: () => void;
  syncState: SyncState;
  setSyncState: (state: SyncState) => void;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const client = useMemo(() => getSupabaseBrowserClient(), []);
  const [loading, setLoading] = useState(Boolean(client));
  const [session, setSession] = useState<Session | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [syncState, setSyncState] = useState<SyncState>("local");

  useEffect(() => {
    if (!client) return;
    let active = true;
    void (async () => {
      const currentUrl = new URL(window.location.href);
      const code = currentUrl.searchParams.get("code");
      if (code) {
        const callbackUrl = new URL("/auth/callback", currentUrl.origin);
        callbackUrl.searchParams.set("code", code);
        callbackUrl.searchParams.set("next", currentUrl.pathname === "/auth/callback" ? "/" : currentUrl.pathname);
        window.location.replace(callbackUrl);
        return;
      }
      if (currentUrl.searchParams.get("auth_error")) {
        setAuthError("Нэвтрэх session үүсгэж чадсангүй. Supabase Redirect URLs тохиргоог шалгаад дахин оролдоно уу.");
        setAuthOpen(true);
        currentUrl.searchParams.delete("auth_error");
        window.history.replaceState({}, "", `${currentUrl.pathname}${currentUrl.search}${currentUrl.hash}`);
      }
      const { data } = await client.auth.getSession();
      if (!active) return;
      setSession(data.session);
      setLoading(false);
    })();
    const { data } = client.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setLoading(false);
      if (nextSession) setAuthOpen(false);
      else setSyncState("local");
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, [client]);

  const value: AuthContextValue = {
    configured: Boolean(client),
    loading,
    session,
    user: session?.user ?? null,
    authOpen,
    setAuthOpen,
    authError,
    clearAuthError: () => setAuthError(null),
    syncState,
    setSyncState,
    signOut: async () => {
      if (client) await client.auth.signOut();
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used within AuthProvider");
  return value;
}
