import { FundManagerDashboardLoader } from "@/components/fund-manager-dashboard-loader";

export default function HomePage() {
  return <FundManagerDashboardLoader initialTab="performance" pageKind="dashboard" visualV2={process.env.OPENFORGE_FUND_MANAGER_UX_V2 === "true"} />;
}
