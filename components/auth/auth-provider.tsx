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
  const [syncState, setSyncState] = useState<SyncState>("local");

  useEffect(() => {
    if (!client) return;
    let active = true;
    void client.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setLoading(false);
    });
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
