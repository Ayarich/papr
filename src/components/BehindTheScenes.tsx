export default function BehindTheScenes({ points, children }: { points: React.ReactNode[]; children?: React.ReactNode }) {
  return (
    <details className="bts">
      <summary>Behind the scenes: what the system does here</summary>
      <div className="in">
        <ul>{points.map((p, i) => <li key={i}>{p}</li>)}</ul>
        {children}
      </div>
    </details>
  );
}
