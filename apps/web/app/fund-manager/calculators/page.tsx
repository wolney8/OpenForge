import { Suspense } from "react";
import { CalculatorWorkspace } from "@/components/calculator-workspace";

export default function FundManagerCalculatorsPage() {
  return <main className="page-shell stack"><Suspense fallback={<section className="content-panel" aria-busy="true">Loading calculators…</section>}><CalculatorWorkspace /></Suspense></main>;
}
