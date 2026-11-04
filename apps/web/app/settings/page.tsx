import { FundManagerSettingsShell } from "@/components/fund-manager-settings-shell";

export default function FundManagerSettingsPage() {
  return <FundManagerSettingsShell visualV2={process.env.OPENFORGE_FUND_MANAGER_UX_V2 === "true"} />;
}
