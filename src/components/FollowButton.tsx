import { toggleFollow } from "@/app/social-actions";

export default function FollowButton({ kind, value, following, back, label }: { kind: string; value: string; following: boolean; back: string; label: string }) {
  return (
    <form action={toggleFollow} style={{ display: "inline" }}>
      <input type="hidden" name="kind" value={kind} /><input type="hidden" name="value" value={value} /><input type="hidden" name="back" value={back} />
      <button type="submit" className={`btn sm ${following ? "" : "outline"}`} aria-pressed={following}>{following ? `✓ Following${label ? " " + label : ""}` : `+ Follow${label ? " " + label : ""}`}</button>
    </form>
  );
}
