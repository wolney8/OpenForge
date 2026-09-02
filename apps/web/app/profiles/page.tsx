import { FundManagerDashboardLoader } from "@/components/fund-manager-dashboard-loader";
import type { DirectoryStatus } from "@/components/cross-profile-analytics";
import { redirect } from "next/navigation";

export default async function ProfilesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  if (query.view === "performance") redirect("/");
  if (query.view === "reports") redirect("/reports");
  const requestedStatus = typeof query.status === "string" ? query.status : "";
  const initialDirectoryStatus: DirectoryStatus =
    requestedStatus === "Archived" || requestedStatus === "all" ? requestedStatus : "Active";
  return (
      <FundManagerDashboardLoader
        initialDirectoryStatus={initialDirectoryStatus}
        initialTab="profiles"
        initialDetailProfileId={typeof query.profile === "string" ? query.profile : undefined}
        initialFeeReviewMonth={typeof query.feeReview === "string" ? query.feeReview : undefined}
        initialOpportunityId={typeof query.opportunity === "string" ? query.opportunity : undefined}
        pageKind="profiles"
      />
  );
}
