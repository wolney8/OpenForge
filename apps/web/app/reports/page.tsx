import { FundManagerDashboardLoader } from "@/components/fund-manager-dashboard-loader";

export default function ReportsPage() {
  return <FundManagerDashboardLoader initialTab="reports" pageKind="reports" visualV2={process.env.OPENFORGE_FUND_MANAGER_UX_V2 === "true"} />;
}
