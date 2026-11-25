import { requireUser } from "@/lib/auth";
import ToolPage from "@/components/tools/ToolPage";
import QuestionnaireTool from "@/components/tools/QuestionnaireTool";

export const dynamic = "force-dynamic";
export const metadata = { title: "Questionnaire builder" };

export default async function Page() {
  await requireUser("/tools/questionnaire");
  return (
    <ToolPage title="Questionnaire builder" intro="Build your survey with ready-made background questions and Likert scales, then download a printable Word file and a codebook for entering the answers in Excel or SPSS.">
      <QuestionnaireTool />
    </ToolPage>
  );
}
