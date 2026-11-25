import Link from "next/link";
import { TOOL_LIST } from "@/lib/tool-list";
import Icon from "@/components/Icon";

export const metadata = { title: "Tools" };

export default function ToolsHub() {
  return (
    <div className="stack" style={{ gap: 32 }}>
      <div className="slides-hero"><span className="eyebrow">Free tools</span><h1>Everything for your final-year project</h1>
        <p className="muted" style={{ maxWidth: "58ch", marginTop: 10 }}>Upload your PDF once and use it everywhere: check it before your supervisor does, practise your defence, make slides and a poster. Then publish it on papr.</p></div>
      <div className="toolgrid stagger">
        {TOOL_LIST.map((t) => (
          <Link key={t.href} href={t.href} className="toolcard">
            <span className="emo"><Icon name={t.icon} size={22} /></span>
            <span className="tag plain">{t.tag}</span>
            <h3>{t.name}</h3>
            <p className="small muted">{t.desc}</p>
            <span className="link-arrow small">Open →</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
