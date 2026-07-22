"use client";

import { useState } from "react";
import { useAuth } from "./auth-provider";

const labels = {
  local: "Зөвхөн энэ төхөөрөмжид",
  syncing: "Cloud sync хийж байна…",
  synced: "Cloud-д хадгалагдсан",
  pending: "Sync хүлээгдэж байна",
};

export function AccountMenu() {
  const { user, loading, syncState, setAuthOpen, signOut } = useAuth();
  const [open, setOpen] = useState(false);

  if (!user) {
    return (
      <button className="cloud-save-button" type="button" disabled={loading} onClick={() => setAuthOpen(true)}>
        {loading ? "Шалгаж байна…" : "Ахицаа cloud-д хадгалах"}
      </button>
    );
  }

  const displayName = user.user_metadata?.full_name ?? user.user_metadata?.name ?? user.email ?? "Хэрэглэгч";
  return (
    <div className="account-menu">
      <button className="profile-dot" type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-label="Account цэс">
        {String(displayName).trim().charAt(0).toLocaleUpperCase("mn-MN")}
      </button>
      {open && (
        <div className="account-popover">
          <strong>{displayName}</strong>
          {user.email && <span>{user.email}</span>}
          <p className={`sync-state ${syncState}`}>{labels[syncState]}</p>
          <button type="button" onClick={() => void signOut()}>Гарах</button>
        </div>
      )}
    </div>
  );
}
