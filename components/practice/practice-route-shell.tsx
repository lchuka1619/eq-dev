import Link from "next/link";

type PracticeRouteShellProps = {
  label: string;
  children: React.ReactNode;
};

export function PracticeRouteShell({ label, children }: PracticeRouteShellProps) {
  return (
    <main className="focused-practice">
      <nav className="focused-practice-nav section-shell" aria-label="Дасгалын байршил">
        <Link href="/today">← Өнөөдөр</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">{label}</span>
      </nav>
      {children}
    </main>
  );
}
