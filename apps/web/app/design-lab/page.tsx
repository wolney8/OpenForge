import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { DesignLabJourney } from "@/components/design-lab-journey";
import { designLabAllowed } from "@/lib/design-lab-access";

export const dynamic = "force-dynamic";

export default async function DesignLabPage() {
  const requestHeaders = await headers();
  if (!designLabAllowed({
    host: requestHeaders.get("host"),
    enabled: process.env.OPENFORGE_DESIGN_LAB_ENABLED,
    nodeEnv: process.env.NODE_ENV,
    vercel: process.env.VERCEL,
  })) notFound();
  return <DesignLabJourney />;
}
