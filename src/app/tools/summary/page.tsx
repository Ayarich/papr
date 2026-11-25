import { requireUser } from "@/lib/auth";
import { all } from "@/lib/db";
import ToolPage from "@/components/tools/ToolPage";
import SummaryTool from "@/components/tools/SummaryTool";

export const dynamic = "force-dynamic";
export const metadata = { title: "Research summary" };

export default async function Page() {
  const user = await requireUser("/tools/summary");
  const papers = await all<{ id: string; title: string; ref: string }>("SELECT id, title, ref FROM submissions WHERE owner_id = ? ORDER BY updated_at DESC", [user.id]);
  return (
    <ToolPage title="Research summary" intro="Turn your project into a one-page research summary for Master's, PhD, scholarship and job applications. Edit every line, then download it as Word or PDF.">
      <SummaryTool papers={papers} me={{ name: user.name || "", email: user.email, programme: user.programme || "" }} />
    </ToolPage>
  );
}
