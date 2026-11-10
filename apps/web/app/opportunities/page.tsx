import { Suspense } from "react";
import { redirect } from "next/navigation";
import { OpportunitiesPage } from "@/components/opportunities-page";

export default function OpportunitiesRoute() {
  if (process.env.OPENFORGE_FUND_MANAGER_UX_V2 !== "true") redirect("/profiles");
  return <Suspense fallback={<main className="page-shell"><p role="status">Loading opportunities…</p></main>}><OpportunitiesPage /></Suspense>;
}
