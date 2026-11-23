import Link from "next/link";
export default function NotFound() {
  return (
    <div className="card empty">
      <h2>We couldn&apos;t find that page</h2>
      <p style={{ marginTop: 8 }}>It may have moved, or the paper may still be in review. <Link href="/library">Go to the library</Link></p>
    </div>
  );
}
