"use client";

import { useAuth } from "@/components/auth/auth-provider";

const syncLabels = {
  local: "Зөвхөн энэ төхөөрөмжид хадгалж байна",
  syncing: "Cloud sync хийж байна…",
  synced: "Cloud-д хадгалагдсан",
  pending: "Sync хүлээгдэж байна — төхөөрөмж дээр хадгалагдсан",
};

export function ProfilePage() {
  const { user, loading, syncState, setAuthOpen, signOut } = useAuth();
  return (
    <main className="profile-page section-shell">
      <div className="section-heading">
        <div><p className="eyebrow">ПРОФАЙЛ БА НУУЦЛАЛ</p><h1>Таны account, таны хяналт</h1></div>
        <p>Guest горимд дасгал үргэлжилнэ. Account нь ахицыг төхөөрөмжүүдийн хооронд сэргээхэд ашиглагдана.</p>
      </div>
      <div className="profile-grid">
        <article>
          <p className="small-label">ACCOUNT</p>
          {loading ? <p>Session сэргээж байна…</p> : user ? (
            <>
              <h2>{user.user_metadata?.full_name ?? user.user_metadata?.name ?? user.email ?? "Хэрэглэгч"}</h2>
              {user.email && <p>{user.email}</p>}
              <p className={`sync-state ${syncState}`}>{syncLabels[syncState]}</p>
              <button className="secondary-button" type="button" onClick={() => void signOut()}>Гарах</button>
            </>
          ) : (
            <>
              <h2>Guest горим</h2>
              <p>Таны ахиц энэ төхөөрөмж дээр хадгалагдана.</p>
              <button className="primary-button" type="button" onClick={() => setAuthOpen(true)}>Cloud-д хадгалахын тулд нэвтрэх</button>
            </>
          )}
        </article>
        <article>
          <p className="small-label">НУУЦЛАЛ</p>
          <h2>Дасгалын агуулга хувийн хэвээр</h2>
          <ul>
            <li>Audio болон transcript cloud database-д хадгалахгүй.</li>
            <li>Connected rehearsal-ийн яг хэлсэн хариулт зөвхөн төхөөрөмж дээр үлдэнэ.</li>
            <li>Cloud sync алдаа гарсан ч local progress устахгүй.</li>
          </ul>
        </article>
      </div>
    </main>
  );
}
