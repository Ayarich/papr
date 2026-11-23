import { STATUS_LABEL } from "@/lib/constants";

export default function StatusPill({ status }: { status: string }) {
  return <span className={`pill ${status}`}>{STATUS_LABEL[status] || status}</span>;
}
