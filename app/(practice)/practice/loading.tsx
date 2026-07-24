export default function PracticeLoading() {
  return (
    <main className="focused-practice" aria-busy="true" aria-live="polite">
      <div className="focused-practice-loading section-shell">
        <span className="focused-practice-loading-mark" aria-hidden="true" />
        <p>Дасгалыг бэлдэж байна…</p>
      </div>
    </main>
  );
}
