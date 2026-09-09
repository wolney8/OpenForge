import { Suspense } from "react";

import { CalculatorWorkspace } from "@/components/calculator-workspace";

export default function CalculatorPopoutPage() {
  return <Suspense fallback={<section aria-busy="true" className="content-panel">Loading calculator…</section>}><CalculatorWorkspace popout /></Suspense>;
}
