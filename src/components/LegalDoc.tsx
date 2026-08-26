import type { LegalDocData } from '@/lib/legal-content';

// v2 legal template: eyebrow, display H1, effective-date pill, sticky mono
// TOC rail, numbered sections with Archivo headings. Content comes from the
// generated legal-content module (verbatim from the signed-off documents).
export function LegalDoc({ doc }: { doc: LegalDocData }) {
  return (
    <section>
      <div className="wrap legal-page">
        <div className="legal-head">
          <span className="eyebrow">Legal</span>
          <h1>{doc.h1}</h1>
          <p className="sub">{doc.sub}</p>
          {doc.effective && <span className="effective-pill">{doc.effective}</span>}
        </div>
        <div className="legal-body">
          <nav className="legal-toc" aria-label="Contents">
            <span className="toc-label">Contents</span>
            {doc.sections.map((section) => (
              <a key={section.id} href={`#${section.id}`}>
                {section.num && <span className="n">{section.num}</span>}
                <span>{section.heading}</span>
              </a>
            ))}
          </nav>
          <div className="legal-sections">
            {doc.intro.length > 0 && (
              <div className="legal-intro">
                {doc.intro.map((html, i) => (
                  <p key={i} dangerouslySetInnerHTML={{ __html: html }} />
                ))}
              </div>
            )}
            {doc.sections.map((section) => (
              <div key={section.id} id={section.id} className="legal-section">
                <div className="legal-section-head">
                  {section.num && <span className="n">{section.num}</span>}
                  <h2>{section.heading}</h2>
                </div>
                {section.body.map((block, i) =>
                  block.kind === 'list' ? (
                    <ul key={i}>
                      {(block.items ?? []).map((item, j) => (
                        <li key={j} dangerouslySetInnerHTML={{ __html: item }} />
                      ))}
                    </ul>
                  ) : (
                    <p key={i} dangerouslySetInnerHTML={{ __html: block.html ?? '' }} />
                  )
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
