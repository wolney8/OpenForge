import { ProfileImportRecoveryDiagnostics } from "@/components/profile-import-recovery-diagnostics";

type ImportRecoveryPageProps = {
  params: Promise<{ profileId: string }>;
};

export default async function ImportRecoveryPage({ params }: ImportRecoveryPageProps) {
  const { profileId } = await params;

  return (
    <main className="page-shell stack" data-pd-id="import-recovery.page">
      <section className="content-panel stack" aria-labelledby="import-recovery-title">
        <div>
          <span className="eyebrow">Fund Manager recovery</span>
          <h1 id="import-recovery-title">Import Recovery</h1>
          <p className="field-hint">
            Rollback-safety evidence and emergency Profile lifecycle controls. This route does not
            load tracker reporting, Accounts, Sportsbook, Reports, or Profile Management.
          </p>
        </div>
        <ProfileImportRecoveryDiagnostics profileId={profileId} />
      </section>
    </main>
  );
}
