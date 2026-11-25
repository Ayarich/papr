import { requireUser } from "@/lib/auth";
import ToolPage from "@/components/tools/ToolPage";
import ProjectPlanner from "@/components/tools/ProjectPlanner";

export const dynamic = "force-dynamic";
export const metadata = { title: "Project planner" };

export default async function Page() {
  await requireUser("/tools/planner");
  return (
    <ToolPage title="Project planner" intro="Enter your deadline and get a chapter-by-chapter plan. Tick steps off as you go, and add reminders to your phone's calendar so nothing sneaks up on you.">
      <ProjectPlanner />
    </ToolPage>
  );
}
