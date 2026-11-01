import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { DesignLabJourney } from "@/components/design-lab-journey";
import { DesignLabConnected } from "@/components/design-lab-connected";
import { DesignLabConnectedCp113 } from "@/components/design-lab-connected-cp113";
import { designLabAllowed } from "@/lib/design-lab-access";

export const dynamic = "force-dynamic";

export default async function DesignLabPage({ searchParams }: { searchParams: Promise<{ baseline?: string }> }) {
  const requestHeaders = await headers();
  if (!designLabAllowed({
    host: requestHeaders.get("host"),
    enabled: process.env.OPENFORGE_DESIGN_LAB_ENABLED,
    nodeEnv: process.env.NODE_ENV,
    vercel: process.env.VERCEL,
  })) notFound();
  const baseline = (await searchParams).baseline;
  return baseline === "cp112" ? <DesignLabJourney /> : baseline === "cp113" ? <DesignLabConnectedCp113 /> : <DesignLabConnected />;
}
