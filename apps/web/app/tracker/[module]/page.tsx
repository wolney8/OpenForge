import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { CombinedLedgerPage } from "@/components/combined-ledger-page";
import { isCombinedLedgerModule } from "@/lib/profile-scope";

export default async function CombinedTrackerPage({ params }: { params: Promise<{ module: string }> }) {
  const { module } = await params;
  if (!isCombinedLedgerModule(module)) notFound();
  if (process.env.OPENFORGE_FUND_MANAGER_UX_V2 !== "true") redirect("/profiles");
  return <Suspense fallback={<main className="page-shell"><p role="status">Loading ledger…</p></main>}><CombinedLedgerPage module={module} /></Suspense>;
}
