import { FundManagerDashboardLoader } from "@/components/fund-manager-dashboard-loader";

export default async function ProfilesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  return (
      <FundManagerDashboardLoader
        initialTab={
          query.view === "performance" || query.view === "reports" || query.view === "profiles"
            ? query.view
            : "profiles"
        }
        initialDetailProfileId={typeof query.profile === "string" ? query.profile : undefined}
        initialFeeReviewMonth={typeof query.feeReview === "string" ? query.feeReview : undefined}
        initialOpportunityId={typeof query.opportunity === "string" ? query.opportunity : undefined}
      />
  );
}
