"use client";

import { SportsbookWorkflowShell as LegacySportsbookWorkflowShell } from "@/components/sportsbook-workflow-legacy-shell";
import { SportsbookWorkflowShell as WorkflowFirstSportsbookWorkflowShell } from "@/components/sportsbook-workflow-first-shell";

type SportsbookLayoutVariant = "legacy" | "workflow-first";

const sportsbookLayoutVariant: SportsbookLayoutVariant = "workflow-first";

export function SportsbookWorkflowShell({
  profileId,
  initialQuery,
}: {
  profileId: string;
  initialQuery?: string;
}) {
  if (sportsbookLayoutVariant === "legacy") {
    return <LegacySportsbookWorkflowShell profileId={profileId} />;
  }

  return <WorkflowFirstSportsbookWorkflowShell initialQuery={initialQuery} profileId={profileId} />;
}
