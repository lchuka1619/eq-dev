"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/auth-provider";

export function PublicLanding() {
  const router = useRouter();
  const { loading, user, setAuthOpen } = useAuth();

  useEffect(() => {
    if (!loading && user) router.replace("/today");
  }, [loading, router, user]);

  if (loading || user) {
    return <main className="route-loading" aria-live="polite"><span className="brand-mark">Ө</span><p>Таны дасгалыг нээж байна…</p></main>;
  }

  return (
    <main className="public-landing">
      <header className="public-header">
        <Link className="brand" href="/" aria-label="Өдөр бүрийн харилцаа нүүр">
          <span className="brand-mark">Ө</span><span>Өдөр бүрийн харилцаа</span>
        </Link>
        <button className="text-button" type="button" onClick={() => setAuthOpen(true)}>Нэвтрэх</button>
      </header>
      <section className="public-hero" aria-labelledby="landing-title">
        <div>
          <p className="eyebrow">ӨДӨР БҮРИЙН 3–10 МИНУТ</p>
          <h1 id="landing-title">Сонсож ойлгоод,<br />тодорхой хариулъя</h1>
          <p>Бодит ярианаас өмнө нэг чадвараа аюулгүй орчинд бага багаар давтаж, өөрийн хэмнэлээр ахина.</p>
          <div className="landing-actions">
            <Link className="primary-button" href="/today">Дасгал эхлэх <span aria-hidden="true">→</span></Link>
            <button className="secondary-button" type="button" onClick={() => setAuthOpen(true)}>Нэвтрэх</button>
          </div>
          <small>Нэвтрэхгүйгээр дасгал хийж болно. Нэвтэрвэл ахиц бүх төхөөрөмжид хадгалагдана.</small>
        </div>
        <aside aria-label="Дасгалын зарчим">
          <span>01</span><b>Нэг чадвар</b><p>Нэг удаад нэг гол үйлдэлд төвлөрнө.</p>
          <span>02</span><b>Жижиг давталт</b><p>Танил бүтэц дээр нөхцөлийг бага өөрчилнө.</p>
          <span>03</span><b>Таны хяналт</b><p>Pause, hint, text mode, safe finish үргэлж нээлттэй.</p>
        </aside>
      </section>
    </main>
  );
}
