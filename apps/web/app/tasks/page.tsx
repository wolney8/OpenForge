import { DailyTasksPage as DailyTasksWorkspace } from "@/components/daily-tasks-page";

export default function DailyTasksPage() {
  return <DailyTasksWorkspace uxV2={process.env.OPENFORGE_FUND_MANAGER_UX_V2 === "true"} />;
}
