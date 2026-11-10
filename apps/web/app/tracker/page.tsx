import { Suspense } from "react";
import { redirect } from "next/navigation";
import { TrackerOverview } from "@/components/tracker-overview";

export default function TrackerRoute() {
  if (process.env.OPENFORGE_FUND_MANAGER_UX_V2 !== "true") redirect("/profiles");
  return <Suspense fallback={<main className="page-shell"><p role="status">Loading Tracker…</p></main>}><TrackerOverview /></Suspense>;
}
