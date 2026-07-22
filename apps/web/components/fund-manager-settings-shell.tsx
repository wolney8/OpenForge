import { MasterAccountCatalogueSettings } from "@/components/master-account-catalogue-settings";
import { FundManagerAuthoritySettings } from "@/components/fund-manager-authority-settings";
import { CommonBetComboSettings } from "@/components/common-bet-combo-settings";
import { DatabaseBackupSettings } from "@/components/database-backup-settings";

export function FundManagerSettingsShell() {
  return (
    <main className="page-shell stack" data-pd-id="fund-manager-settings.page">
      <section className="hero-panel stack">
        <span className="eyebrow">Fund Manager</span>
        <h1>Settings</h1>
      </section>
      <MasterAccountCatalogueSettings />
      <FundManagerAuthoritySettings />
      <CommonBetComboSettings />
      <DatabaseBackupSettings />
    </main>
  );
}
