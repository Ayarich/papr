import { requireUser } from "@/lib/auth";
import ToolPage from "@/components/tools/ToolPage";
import CitationTool from "@/components/tools/CitationTool";

export const dynamic = "force-dynamic";
export const metadata = { title: "Citation generator" };

export default async function Page() {
  await requireUser("/tools/cite");
  return (
    <ToolPage title="Citation generator" intro="Paste a DOI or a link and get a correct APA 7 reference, with the in-text citation. Build your whole reference list and copy it straight into Word.">
      <CitationTool />
    </ToolPage>
  );
}
