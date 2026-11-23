import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { FIELDS } from "@/lib/constants";
import { badgesFor } from "@/lib/badges";
import { updateProfile } from "@/app/social-actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "My profile" };

export default async function ProfileEdit({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  const sp = await searchParams;
  const user = await requireUser("/profile");
  const badges = await badgesFor(user.id);
  const interests = (user.interests || "").split(",");
  const suggested = (user.name || user.email.split("@")[0]).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return (
    <div className="narrow stack" style={{ gap: 24, maxWidth: 760 }}>
      <div className="row between"><h1>My profile</h1>{user.handle && <Link className="btn sm" href={`/u/${user.handle}`}>View public profile →</Link>}</div>
      {sp.saved && <div className="notice ok">Saved.{user.handle ? <> Your public profile is <Link href={`/u/${user.handle}`}>/u/{user.handle}</Link>.</> : null}</div>}
      {sp.error === "handle" && <div className="notice bad">That profile address is taken. Try another.</div>}
      {badges.length > 0 && <div className="badges">{badges.map((b) => <span key={b.key} className="badge" title={b.desc}>{b.emoji} {b.label}</span>)}</div>}
      <form action={updateProfile} className="card pad-lg stack">
        <div className="grid g2">
          <div className="field"><label className="lbl" htmlFor="p-name">Name</label><input type="text" id="p-name" name="name" defaultValue={user.name} /></div>
          <div className="field"><label className="lbl" htmlFor="p-handle">Profile address</label><input type="text" id="p-handle" name="handle" defaultValue={user.handle || suggested} /><p className="hint">papr/u/{user.handle || suggested}</p></div>
        </div>
        <div className="field"><label className="lbl" htmlFor="p-head">Headline</label><input type="text" id="p-head" name="headline" defaultValue={user.headline || ""} placeholder="e.g. Geomatic Engineering graduate · GIS & remote sensing" /></div>
        <div className="field"><label className="lbl" htmlFor="p-bio">About you</label><textarea id="p-bio" name="bio" defaultValue={user.bio || ""} style={{ minHeight: 100 }} /></div>
        <div className="field"><label className="lbl" htmlFor="p-skills">Skills <span className="muted">(comma-separated)</span></label><input type="text" id="p-skills" name="skills" defaultValue={user.skills || ""} placeholder="e.g. ArcGIS, Python, survey design, SPSS" /></div>
        <div className="field"><label className="lbl" htmlFor="p-li">LinkedIn <span className="muted">(optional)</span></label><input type="text" id="p-li" name="linkedin" defaultValue={user.linkedin || ""} placeholder="https://www.linkedin.com/in/…" /></div>
        <fieldset style={{ border: 0, padding: 0, margin: 0 }}><legend className="lbl">Fields I&apos;m interested in <span className="muted">(for your opportunities feed)</span></legend>
          <div className="row" style={{ gap: 8 }}>{FIELDS.map((f) => <label key={f} className="tag plain" style={{ cursor: "pointer" }}><input type="checkbox" name="interests" value={f} defaultChecked={interests.includes(f)} /> {f}</label>)}</div></fieldset>
        <label className={`check ${user.open_to_opps ? "on" : ""}`} htmlFor="p-open"><input type="checkbox" id="p-open" name="open" defaultChecked={!!user.open_to_opps} />
          <span><b>Open to opportunities</b><br /><span className="small muted">Employers and grad programmes can find you by skill and send you a message through papr. Your email stays private unless you reply.</span></span></label>
        <div><button className="btn primary" type="submit">Save profile</button></div>
      </form>
    </div>
  );
}
