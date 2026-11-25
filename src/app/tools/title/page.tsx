import { requireUser } from "@/lib/auth";
import ToolPage from "@/components/tools/ToolPage";
import TitleTool from "@/components/tools/TitleTool";

export const dynamic = "force-dynamic";
export const metadata = { title: "Title helper" };

export default async function Page() {
  await requireUser("/tools/title");
  return (
    <ToolPage title="Title helper" intro="A good title says what you studied, where, when and how. Type yours to get a score, tips and sharper versions to discuss with your supervisor.">
      <TitleTool />
    </ToolPage>
  );
}
