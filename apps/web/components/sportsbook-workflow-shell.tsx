"use client";

import { SportsbookWorkflowShell as LegacySportsbookWorkflowShell } from "@/components/sportsbook-workflow-legacy-shell";
import { SportsbookWorkflowShell as WorkflowFirstSportsbookWorkflowShell } from "@/components/sportsbook-workflow-first-shell";
import type { FeeReviewResolutionContext } from "@/lib/fee-review-session";

type SportsbookLayoutVariant = "legacy" | "workflow-first";

const sportsbookLayoutVariant: SportsbookLayoutVariant = "workflow-first";

export function SportsbookWorkflowShell({
  profileId,
  initialQuery,
  initialIssueFilter,
  initialRecordId,
  feeReviewContext,
}: {
  profileId: string;
  initialQuery?: string;
  initialIssueFilter?: string;
  initialRecordId?: string;
  feeReviewContext?: FeeReviewResolutionContext;
}) {
  if (sportsbookLayoutVariant === "legacy") {
    return <LegacySportsbookWorkflowShell profileId={profileId} />;
  }

  return <WorkflowFirstSportsbookWorkflowShell feeReviewContext={feeReviewContext} initialIssueFilter={initialIssueFilter} initialQuery={initialQuery} initialRecordId={initialRecordId} profileId={profileId} />;
}
