import { requireUser } from "@/lib/auth";
import { all } from "@/lib/db";
import ToolPage from "@/components/tools/ToolPage";
import StructureTool from "@/components/tools/StructureTool";

export const dynamic = "force-dynamic";
export const metadata = { title: "Structure check" };

export default async function Page() {
  const user = await requireUser("/tools/structure");
  const papers = await all<{ id: string; title: string; ref: string }>("SELECT id, title, ref FROM submissions WHERE owner_id = ? ORDER BY updated_at DESC", [user.id]);
  return (
    <ToolPage title="Structure check" intro="Checks your report has every chapter, how long each one is, and whether your tables and figures are numbered in order, captioned and mentioned in the text.">
      <StructureTool papers={papers} />
    </ToolPage>
  );
}
