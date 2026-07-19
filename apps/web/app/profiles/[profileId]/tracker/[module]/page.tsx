import { notFound, redirect } from "next/navigation";
import { AccountsWorkflowShell } from "@/components/accounts-workflow-shell";
import { CashAdjustmentWorkflowShell } from "@/components/cash-adjustment-workflow-shell";
import { CasinoOfferWorkflowShell } from "@/components/casino-offer-workflow-shell";
import { FreeBetWorkflowShell } from "@/components/free-bet-workflow-shell";
import { ProfileFlexibleNav } from "@/components/profile-flexible-nav";
import { ProfileSettingsShell } from "@/components/profile-settings-shell";
import { SportsbookWorkflowShell } from "@/components/sportsbook-workflow-shell";
import { TrackerSummaryShell } from "@/components/tracker-summary-shell";
import { TrackerModuleTable } from "@/components/tracker-module-table";
import { trackerModuleDefinitions, trackerTableModules } from "@/lib/tracker-modules";
import { getModuleRows, getProfile } from "@/lib/tracker-data";
import type { TrackerModuleKey } from "@/lib/tracker-types";
import {
  parseFeeReviewRecordIds,
  type FeeReviewLedger,
  type FeeReviewResolutionContext,
} from "@/lib/fee-review-session";

type TrackerModulePageProps = {
  params: Promise<{
    profileId: string;
    module: keyof typeof trackerModuleDefinitions;
  }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function TrackerModulePage({
  params,
  searchParams,
}: TrackerModulePageProps) {
  const { profileId, module } = await params;
  const query = await searchParams;
  const requestedView = typeof query.view === "string" ? query.view : undefined;
  const requestedSearch = typeof query.search === "string" ? query.search : undefined;
  const requestedRecord = typeof query.record === "string" ? query.record : undefined;
  const requestedRecords = parseFeeReviewRecordIds(
    typeof query.records === "string" ? query.records : undefined
  );
  const requestedIssue =
    query.view === "issues" && typeof query.issue === "string"
      ? query.issue
      : undefined;
  const profile = await getProfile(profileId);
  const moduleDefinition = trackerModuleDefinitions[module];

  if (!profile || !moduleDefinition) {
    notFound();
  }

  const feeReviewLedgerByModule: Partial<Record<keyof typeof trackerModuleDefinitions, FeeReviewLedger>> = {
    "sportsbook-bets": "sportsbook",
    "free-bets": "free_bet",
    "casino-offers": "casino",
  };
  const feeReviewLedger = feeReviewLedgerByModule[module];
  const feeReviewContext: FeeReviewResolutionContext | undefined =
    requestedView === "fee-review" && feeReviewLedger && requestedRecords.length > 0
      ? {
          profileId,
          profileName:
            typeof query.feeProfileName === "string" ? query.feeProfileName : profile.displayName,
          month: typeof query.feeMonth === "string" ? query.feeMonth : "",
          ledger: feeReviewLedger,
          recordIds: requestedRecords,
          returnHref: typeof query.return === "string" ? query.return : "/profiles",
        }
      : undefined;

  if (module === "profit-tracker") {
    redirect(`/profiles/${profileId}/tracker/dashboard`);
  }

  const hasTable = trackerTableModules.has(module as TrackerModuleKey);
  const compactHeroModules = new Set([
    "accounts",
    "sportsbook-bets",
    "free-bets",
    "casino-offers",
    "cash-adjustments",
    "settings",
    "reports",
  ]);
  const usesCompactHero = compactHeroModules.has(module);

  const dataRows = hasTable
    ? await getModuleRows(profileId, module as TrackerModuleKey)
    : [];

  return (
    <main className="page-shell stack">
      <section
        className={`hero-panel stack tracker-hero${usesCompactHero ? " tracker-hero-compact" : ""}`}
      >
        <ProfileFlexibleNav profileId={profile.profileId} />
        {!usesCompactHero ? (
          <>
            <span className="eyebrow">
              /profiles/{profile.profileId}/tracker/{module}
            </span>
            <h1>
              {profile.displayName}: {moduleDefinition.title}
            </h1>
            <p className="lede">{moduleDefinition.summary}</p>
            <div className="meta-grid">
              <dl>
                <dt>Profile context</dt>
                <dd>{profile.profileCode}</dd>
              </dl>
            </div>
          </>
        ) : null}
      </section>
      {module === "accounts" ? (
        <AccountsWorkflowShell profileId={profile.profileId} />
      ) : module === "sportsbook-bets" ? (
        <SportsbookWorkflowShell feeReviewContext={feeReviewContext} initialIssueFilter={requestedIssue} initialQuery={requestedSearch} initialRecordId={requestedRecord} key={`sportsbook:${requestedRecord ?? requestedIssue ?? (requestedRecords.join(",") || "default")}`} profileId={profile.profileId} />
      ) : module === "free-bets" ? (
        <FreeBetWorkflowShell feeReviewContext={feeReviewContext} initialIssueFilter={requestedIssue} initialQuery={requestedSearch} initialRecordId={requestedRecord} initialTableMode={requestedView} key={`free-bets:${requestedRecord ?? requestedIssue ?? (requestedRecords.join(",") || requestedView || "default")}`} profileId={profile.profileId} />
      ) : module === "casino-offers" ? (
        <CasinoOfferWorkflowShell feeReviewContext={feeReviewContext} initialIssueFilter={requestedIssue} initialQuery={requestedSearch} initialRecordId={requestedRecord} key={`casino:${requestedRecord ?? requestedIssue ?? (requestedRecords.join(",") || "default")}`} profileId={profile.profileId} />
      ) : module === "cash-adjustments" ? (
        <CashAdjustmentWorkflowShell profileId={profile.profileId} />
      ) : module === "profit-tracker" ? (
        <TrackerSummaryShell profileId={profile.profileId} variant="profit-tracker" />
      ) : module === "reports" ? (
        <TrackerSummaryShell profileId={profile.profileId} variant="reports" />
      ) : module === "settings" ? (
        <ProfileSettingsShell profileId={profile.profileId} />
      ) : hasTable ? (
        <TrackerModuleTable
          addLabel={moduleDefinition.addLabel!}
          columns={moduleDefinition.columns!}
          rows={dataRows}
        />
      ) : (
        <section className="content-panel stack">
          <p className="lede">
            This route remains available for later workbook-parity work.
          </p>
        </section>
      )}
    </main>
  );
}
