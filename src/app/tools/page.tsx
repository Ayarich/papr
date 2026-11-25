import Link from "next/link";
import { STAGES, TOOL_LIST } from "@/lib/tool-list";
import Icon from "@/components/Icon";

export const metadata = { title: "Tools" };

export default function ToolsHub() {
  return (
    <div className="stack" style={{ gap: 40 }}>
      <div className="slides-hero"><span className="eyebrow">{TOOL_LIST.length} free tools</span><h1>Everything for your final-year project</h1>
        <p className="muted" style={{ maxWidth: "60ch", marginTop: 10 }}>From picking a title to defending your work: plan your time, build your questionnaire, get your references right, check your report before your supervisor does, then make slides and a poster. When you&apos;re done, publish it on papr.</p></div>
      {STAGES.map((st, k) => {
        const tools = TOOL_LIST.filter((t) => t.stage === st.key);
        if (!tools.length) return null;
        return (
          <section key={st.key} className="stack" style={{ gap: 14 }}>
            <div className="tool-stage"><span className="num">{k + 1}</span><div><h2>{st.title}</h2><p className="small muted">{st.desc}</p></div></div>
            <div className="toolgrid stagger">
              {tools.map((t) => (
                <Link key={t.href} href={t.href} className="toolcard">
                  <span className="emo"><Icon name={t.icon} size={22} /></span>
                  <span className="row" style={{ gap: 6 }}><span className="tag plain">{t.tag}</span>{t.isNew && <span className="newpill">New</span>}</span>
                  <h3>{t.name}</h3>
                  <p className="small muted">{t.desc}</p>
                  <span className="link-arrow small">Open →</span>
                </Link>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
