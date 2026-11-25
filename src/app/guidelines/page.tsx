import Link from "next/link";
import { ABSTRACT_MAX, ABSTRACT_MIN } from "@/lib/validate";
import { LEVELS, TYPES } from "@/lib/constants";

export const metadata = { title: "Author guidelines", description: "How to prepare your research for papr: what we accept, the sample article format, formatting, references and ethics." };

const FACTS = [
  ["📄", "PDF only", "Up to 20 MB, with selectable text"],
  ["✍️", `${ABSTRACT_MIN}–${ABSTRACT_MAX} words`, "Abstract, one paragraph"],
  ["🏷️", "3–6 keywords", "Words people would search for"],
  ["🔍", "Under 25%", "Similarity, after quotes and references"],
  ["👩🏾‍🏫", "Supervisor", "Confirms your work by email"],
];

const FORMAT: [string, string, string][] = [
  ["Title", "Under 20 words", "Specific: say what, where and when. “Urban Growth of Sekondi-Takoradi, 1994–2024” beats “A Study of Urbanisation”."],
  ["Authors", "Names and affiliations", "You, any co-authors and your supervisor, with department and university. Add a contact email."],
  ["Abstract", `${ABSTRACT_MIN}–${ABSTRACT_MAX} words`, "Background, aim, methods, main results with numbers, and conclusion. No references."],
  ["Keywords", "3–6", "Don't repeat words already in the title."],
  ["1. Introduction", "1–2 pages", "Background, the problem or gap, why it matters in Ghana, then your aim and objectives."],
  ["2. Literature review", "1–2 pages", "What earlier studies found and the gap you fill. Group by theme. Can be merged with the Introduction."],
  ["3. Materials and methods", "1–3 pages", "Study area (with a location map), data, sampling, software and analysis, so someone could repeat it."],
  ["4. Results", "2–5 pages", "Findings in the order of your objectives, with numbered tables and figures."],
  ["5. Discussion", "1–2 pages", "What the results mean, how they compare with other studies, and your limitations."],
  ["6. Conclusion and recommendations", "½–1 page", "Answer each objective, then practical recommendations that name who should act."],
  ["Ethics and data statement", "A few lines", "Consent, anonymity, permission for company data, where your data is, and any AI tools used."],
  ["References", "APA 7th edition", "Alphabetical. Every citation in the text must be in the list, and the other way round."],
];

export default function Guidelines() {
  return (
    <div className="guide">
      <header className="guide-hero">
        <span className="eyebrow">For authors</span>
        <h1>Author guidelines</h1>
        <p className="muted">Everything you need to prepare your research for papr, with a sample article format you can download and fill in. Following it makes moderation quicker and your paper easier to find and cite.</p>
        <div className="row" style={{ marginTop: 18, flexWrap: "wrap" }}>
          <a className="btn primary" href="/papr-article-template.docx" download>⬇ Download Word template</a>
          <a className="btn" href="/papr-article-template.pdf" target="_blank" rel="noopener">Preview as PDF</a>
          <Link className="btn ghost" href="/submit">Submit research →</Link>
        </div>
      </header>

      <div className="facts">
        {FACTS.map(([e, b, s]) => <div key={b} className="fact"><span aria-hidden>{e}</span><b>{b}</b><span className="small muted">{s}</span></div>)}
      </div>

      <div className="guide-body">
        <nav className="toc" aria-label="On this page">
          <b className="small">On this page</b>
          <a href="#who">Who can submit</a>
          <a href="#what">What we accept</a>
          <a href="#format">Sample article format</a>
          <a href="#style">Formatting</a>
          <a href="#refs">References</a>
          <a href="#ethics">Ethics and originality</a>
          <a href="#process">After you submit</a>
          <a href="#licence">Licence and rights</a>
        </nav>

        <article className="guide-text">
          <section id="who">
            <h2>Who can submit</h2>
            <ul>
              <li>Students at Ghanaian universities and technical universities, logging in with a university email ending in <b>.edu.gh</b>.</li>
              <li>Study level: {LEVELS.join(", ")}.</li>
              <li>Your supervisor must agree to the work being shared. We email them to confirm.</li>
            </ul>
          </section>

          <section id="what">
            <h2>What we accept</h2>
            <p>Original research with a clear problem, method, results and references. Accepted types: {TYPES.join(", ")}.</p>
            <p>You can upload your <b>full project report</b> as it is, or a shorter <b>papr article</b> (about 8–15 pages) using the format below. Short articles are read and cited more, and they're quicker to review.</p>
            <p className="small muted">Not accepted: class essays without research, assignments copied from others, and work containing confidential data you don&apos;t have permission to share.</p>
          </section>

          <section id="format">
            <h2>Sample article format</h2>
            <p>Use these sections in this order. The <a href="/papr-article-template.docx" download>Word template</a> has them set up with instructions in grey.</p>
            <div className="format-wrap">
              <div className="a4" aria-hidden>
                <div className="a4-title" /><div className="a4-line w60 c" /><div className="a4-line w40 c" />
                <div className="a4-h">Abstract</div><div className="a4-line" /><div className="a4-line" /><div className="a4-line w70" />
                <div className="a4-h">1. Introduction</div><div className="a4-line" /><div className="a4-line w80" />
                <div className="a4-h">3. Methods</div><div className="a4-fig">Figure 1: Study area</div>
                <div className="a4-h">4. Results</div><div className="a4-tab"><i /><i /><i /><i /><i /><i /></div>
                <div className="a4-h">References</div><div className="a4-line w90" /><div className="a4-line w70" />
              </div>
              <ol className="format-list">
                {FORMAT.map(([h, len, d]) => (
                  <li key={h}><div className="row between" style={{ gap: 10 }}><b>{h}</b><span className="tag plain small">{len}</span></div><p className="small muted">{d}</p></li>
                ))}
              </ol>
            </div>
          </section>

          <section id="style">
            <h2>Formatting</h2>
            <ul>
              <li>A4 paper, 2.5 cm margins, page numbers.</li>
              <li>Times New Roman 12 pt (or Arial 11 pt), 1.5 line spacing.</li>
              <li>Numbered headings (1, 1.1, 1.2) as in the template.</li>
              <li>Number tables and figures in order. Captions go <b>above tables</b> and <b>below figures</b>, with the source, e.g. “Source: Field survey, 2026”.</li>
              <li>Use SI units, and write out abbreviations the first time, e.g. “Geographic Information System (GIS)”.</li>
              <li>Export to PDF from Word or Google Docs (File &gt; Save As &gt; PDF). Don&apos;t scan printed pages: papr needs selectable text to check similarity, make slides and help people find your work.</li>
              <li>Remove tracked changes, comments and your supervisor&apos;s markings.</li>
            </ul>
          </section>

          <section id="refs">
            <h2>References</h2>
            <p>Use <b>APA 7th edition</b>. In the text: (Mensah, 2021) or Owusu and Boateng (2019); for three or more authors, (Asante et al., 2020).</p>
            <div className="refbox small">
              <p>Surname, A. B. (2021). Title of the article in sentence case. <i>Journal Name, 13</i>(2), 45–60. https://doi.org/10.xxxx/xxxxx</p>
              <p>Surname, A., &amp; Surname, B. (2019). <i>Title of the book in sentence case</i> (2nd ed.). Publisher.</p>
              <p>Ghana Statistical Service. (2021). <i>2021 Population and housing census: General report</i> (Vol. 3A).</p>
            </div>
            <p className="small">Not sure your list is right? Run it through the <Link href="/tools/references">reference checker</Link> before you submit.</p>
          </section>

          <section id="ethics">
            <h2>Ethics and originality</h2>
            <ul>
              <li><b>Cite everything you use.</b> Put copied wording in quotation marks with a citation. papr checks every submission against the library, and overall similarity should be under 25%. Use <Link href="/tools/precheck">Pre-check</Link> to see your score first.</li>
              <li><b>Protect participants.</b> No names, phone numbers, house numbers or identifiable photos of people who took part. Describe how you got consent.</li>
              <li><b>Company and internship data.</b> Only include it with written permission from the organisation. Otherwise summarise or remove it.</li>
              <li><b>Images and maps</b> you didn&apos;t make need permission or a licence that allows sharing, and must be credited.</li>
              <li><b>AI tools.</b> You may use them to check grammar or wording, but say so in your ethics statement. Don&apos;t use them to write your results, invent data or create references. Check every reference really exists.</li>
            </ul>
          </section>

          <section id="process">
            <h2>After you submit</h2>
            <ol>
              <li>You get a reference number straight away, and your supervisor gets an email to confirm.</li>
              <li>A moderator checks that it&apos;s genuine research, the details match the PDF, similarity is acceptable, there&apos;s no personal data and the PDF opens. This usually takes a few days.</li>
              <li>You&apos;re told by email if it&apos;s published, if changes are needed (you can upload a new version), or if it can&apos;t be accepted, with the reason.</li>
              <li>Once published, it gets a permanent link and a ready-made citation you can put on your CV.</li>
            </ol>
            <p className="small muted">papr is a repository. Moderators check papers but do not peer-review them.</p>
          </section>

          <section id="licence">
            <h2>Licence and rights</h2>
            <p>Published papers are free to read under <b>CC BY 4.0</b>: anyone can share and build on your work as long as they credit you. You keep the copyright, and you can still publish a journal version later, though check the journal&apos;s policy on preprints. You can withdraw a submission while it&apos;s in review from <Link href="/my">My submissions</Link>.</p>
          </section>

          <div className="guide-cta">
            <div><b>Ready?</b><p className="small">It takes about 10 minutes, and your progress is saved as you go.</p></div>
            <Link className="btn primary" href="/submit">Submit research</Link>
          </div>
        </article>
      </div>
    </div>
  );
}
