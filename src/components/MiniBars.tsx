// A small single-series bar chart for the last N days, with a tooltip on hover/focus for every bar.
export default function MiniBars({ title, data, unit }: { title: string; data: { day: string; n: number }[]; unit: string }) {
  const max = Math.max(1, ...data.map((d) => d.n));
  const total = data.reduce((a, d) => a + d.n, 0);
  const label = (day: string) => new Date(day + "T12:00:00Z").toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  return (
    <figure className="card minibars">
      <figcaption className="row between"><b className="small">{title}</b><span className="small muted num">{total} in {data.length} days</span></figcaption>
      <div className="bars" role="img" aria-label={`${title}: ${total} ${unit} in the last ${data.length} days, highest ${max} in one day`}>
        {data.map((d) => (
          <div key={d.day} className="bar" tabIndex={0} aria-label={`${label(d.day)}: ${d.n} ${unit}`}>
            <i style={{ height: `${d.n ? Math.max(4, (d.n / max) * 100) : 0}%` }} />
            <span className="tip">{label(d.day)}: <b>{d.n}</b> {unit}</span>
          </div>
        ))}
      </div>
      <div className="row between small muted"><span>{label(data[0].day)}</span><span>Today</span></div>
    </figure>
  );
}
