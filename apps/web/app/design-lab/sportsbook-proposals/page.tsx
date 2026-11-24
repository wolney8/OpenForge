import { headers } from "next/headers";
import { notFound } from "next/navigation";

import { DesignLabSportsbookProposals, type SportsbookProposalId } from "@/components/design-lab-sportsbook-proposals";
import { designLabAllowed } from "@/lib/design-lab-access";

export const dynamic = "force-dynamic";

const valid = new Set(["protected", "offer", "requirements", "matching", "finish", "operations"]);

export default async function SportsbookProposalPage({ searchParams }: { searchParams: Promise<{ amendment?: string; view?: string }> }) {
  const requestHeaders = await headers();
  if (!designLabAllowed({
    host: requestHeaders.get("host"),
    enabled: process.env.OPENFORGE_DESIGN_LAB_ENABLED,
    nodeEnv: process.env.NODE_ENV,
    vercel: process.env.VERCEL,
  })) notFound();
  const params = await searchParams;
  const requested = params.amendment ?? "protected";
  return <DesignLabSportsbookProposals initialAmendment={(valid.has(requested) ? requested : "protected") as SportsbookProposalId} initialPartialLegOpen={requested === "matching" && params.view === "partial-leg"} />;
}
