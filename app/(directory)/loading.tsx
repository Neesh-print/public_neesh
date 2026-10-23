// Shown inside the directory chrome while a title, store, city or index
// page that is not yet cached renders from the database.
export default function DirectoryLoading() {
  return (
    <section>
      <div className="utility-page" role="status" aria-live="polite">
        <span className="eyebrow">Loading</span>
        <div className="loading-lines" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <span className="visually-hidden">Loading the page</span>
      </div>
    </section>
  );
}
