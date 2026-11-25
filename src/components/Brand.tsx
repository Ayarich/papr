// The papr logo: a sheet of paper with a folded corner and a rising line (research that grows).
// Same drawing as public/brand/papr-mark.svg; the rounded square comes from the .mark styles.
export function BrandMark({ size = 20 }: { size?: number }) {
  return (
    <span className="mark" aria-hidden="true">
      <svg width={size} height={size} viewBox="11 11 42 42" fill="none">
        <path d="M21 11h16.5L47 20.5V49a4 4 0 0 1-4 4H21a4 4 0 0 1-4-4V15a4 4 0 0 1 4-4Z" fill="currentColor" />
        <path className="fold" d="M37.5 11v6.5a3 3 0 0 0 3 3H47Z" fill="currentColor" opacity=".55" />
        <path d="M23.5 42.5l6.5-6.8 5 4.3 7-8.2" stroke="var(--mark-line, var(--accent))" strokeWidth="4.2" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="42" cy="31.8" r="3.1" fill="var(--mark-line, var(--accent))" />
      </svg>
    </span>
  );
}
