import Link from "next/link";
import { BrandMark } from "./Brand";

export default function Footer() {
  const dev = process.env.NODE_ENV !== "production";
  return (
    <footer className="site">
      <div className="wrap">
        <div className="cols">
          <div>
            <Link className="brand" href="/"><BrandMark /><b>papr</b></Link>
            <p style={{ maxWidth: "36ch" }}>Drop your research. Get it seen. Ghana&apos;s open library of student research, free to read, cite and share under CC BY 4.0.</p>
          </div>
          <div><h4>Explore</h4><ul><li><Link href="/library">Library</Link></li><li><Link href="/library?sort=views">Most viewed</Link></li><li><Link href="/library?sort=new">Newest</Link></li></ul></div>
          <div><h4>For students</h4><ul><li><Link href="/submit">Submit research</Link></li><li><Link href="/guidelines">Author guidelines</Link></li><li><a href="/papr-article-template.docx" download>Article template (Word)</a></li><li><Link href="/my">My submissions</Link></li><li><Link href="/login">Log in</Link></li></ul></div>
          <div><h4>{dev ? "Developers" : "About"}</h4><ul>
            {dev && <li><Link href="/dev/outbox">Email outbox</Link></li>}
            <li><Link href="/moderate">Moderators</Link></li>
          </ul></div>
        </div>
        <div className="base">
          <span>© {new Date().getFullYear()} papr. Papers are checked by moderators but not peer-reviewed.</span>
          <span>Made for students in Ghana</span>
        </div>
      </div>
    </footer>
  );
}
