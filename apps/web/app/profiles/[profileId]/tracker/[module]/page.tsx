import Link from "next/link";
import { notFound } from "next/navigation";
import { TrackerModuleTable, type TableColumn } from "@/components/tracker-module-table";
import { getModuleRows, getProfile } from "@/lib/tracker-data";
import type { TrackerModuleKey } from "@/lib/tracker-types";

const trackerModules = {
  accounts: {
    title: "Accounts",
    summary: "Bookmaker and exchange account health, balances, and sign-up status.",
    addLabel: "Add account row",
    columns: [
      { key: "id", label: "Account ID" },
      { key: "account", label: "Account" },
      { key: "type", label: "Type" },
      { key: "status", label: "Status" },
      { key: "currentBalance", label: "Current balance" },
      { key: "group", label: "Group" },
      { key: "platform", label: "Platform" },
    ] satisfies TableColumn[],
  },
  "sportsbook-bets": {
    title: "Sportsbook Bets",
    summary: "Qualifying, mug-bet, and sportsbook bet-entry workflow shell.",
    addLabel: "Add sportsbook row",
    columns: [
      { key: "id", label: "Bet ID" },
      { key: "dateSettling", label: "Settles" },
      { key: "bookmaker", label: "Bookmaker" },
      { key: "status", label: "Status" },
      { key: "result", label: "Result" },
      { key: "backStake", label: "Back stake" },
      { key: "backOdds", label: "Back odds" },
      { key: "matchStrategy", label: "Strategy" },
      { key: "layOdds1", label: "Lay odds" },
      { key: "exchange", label: "Exchange" },
      { key: "eventName", label: "Event" },
    ] satisfies TableColumn[],
  },
  "free-bets": {
    title: "Free Bets",
    summary: "Free-bet entry and tracking shell for SNR and SR flows.",
    addLabel: "Add free-bet row",
    columns: [
      { key: "id", label: "Free bet ID" },
      { key: "dateSettling", label: "Settles" },
      { key: "bookmaker", label: "Bookmaker" },
      { key: "status", label: "Status" },
      { key: "result", label: "Result" },
      { key: "retentionMode", label: "Mode" },
      { key: "freeBetValue", label: "Value" },
      { key: "backOdds", label: "Back odds" },
      { key: "matchStrategy", label: "Strategy" },
      { key: "layOdds1", label: "Lay odds" },
      { key: "expiryDateTime", label: "Expiry" },
    ] satisfies TableColumn[],
  },
  "casino-offers": {
    title: "Casino Offers",
    summary: "Casino offer tracking shell.",
    addLabel: "Add casino row",
    columns: [
      { key: "id", label: "Offer ID" },
      { key: "dateStarted", label: "Started" },
      { key: "bookmaker", label: "Bookmaker" },
      { key: "offerType", label: "Offer type" },
      { key: "offerName", label: "Offer name" },
      { key: "cashStake", label: "Cash stake" },
      { key: "freeSpinsAwarded", label: "Free spins" },
      { key: "status", label: "Status" },
      { key: "result", label: "Result" },
    ] satisfies TableColumn[],
  },
  "cash-adjustments": {
    title: "Cash Adjustments",
    summary: "Top-ups, withdrawals, deductions, and signed cash-event shell.",
    addLabel: "Add cash adjustment",
    columns: [
      { key: "id", label: "Adjustment ID" },
      { key: "adjustmentDate", label: "Date" },
      { key: "direction", label: "Direction" },
      { key: "amount", label: "Amount" },
      { key: "adjustmentType", label: "Type" },
      { key: "linkedAccount", label: "Linked account" },
      { key: "description", label: "Description" },
    ] satisfies TableColumn[],
  },
  reports: {
    title: "Reports",
    summary: "Per-profile reporting and date-range views placeholder.",
  },
  "profit-tracker": {
    title: "Profit Tracker",
    summary: "Workbook-style profit drilldown placeholder.",
  },
} as const;

type TrackerModulePageProps = {
  params: Promise<{
    profileId: string;
    module: keyof typeof trackerModules;
  }>;
};

export default async function TrackerModulePage({
  params,
}: TrackerModulePageProps) {
  const { profileId, module } = await params;
  const profile = await getProfile(profileId);
  const moduleDefinition = trackerModules[module];

  if (!profile || !moduleDefinition) {
    notFound();
  }

  const hasTable =
    module === "accounts" ||
    module === "sportsbook-bets" ||
    module === "free-bets" ||
    module === "casino-offers" ||
    module === "cash-adjustments";

  const dataRows = hasTable
    ? await getModuleRows(profileId, module as TrackerModuleKey)
    : [];

  return (
    <main className="page-shell stack">
      <section className="content-panel stack">
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
          <dl>
            <dt>Implementation state</dt>
            <dd>
              {hasTable
                ? "Tabular shell with local workbook seed rows"
                : "Summary surface still pending"}
            </dd>
          </dl>
        </div>
        <div className="tracker-nav">
          <Link href={`/profiles/${profile.profileId}/tracker`}>
            Back to tracker
          </Link>
          <Link href={`/profiles/${profile.profileId}/tracker/dashboard`}>
            Dashboard
          </Link>
        </div>
      </section>
      {hasTable ? (
        <TrackerModuleTable
          addLabel={trackerModules[module].addLabel}
          columns={trackerModules[module].columns}
          rows={dataRows}
        />
      ) : (
        <section className="content-panel stack">
          <p className="lede">
            This route remains deferred until reporting and calculation slices are
            implemented. The current momentum is focused on operational tracker rows.
          </p>
        </section>
      )}
    </main>
  );
}
