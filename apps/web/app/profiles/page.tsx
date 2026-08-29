import { FundManagerDashboardLoader } from "@/components/fund-manager-dashboard-loader";
import { redirect } from "next/navigation";

export default async function ProfilesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  if (query.view === "performance") redirect("/");
  if (query.view === "reports") redirect("/reports");
  return (
      <FundManagerDashboardLoader
        initialTab="profiles"
        initialDetailProfileId={typeof query.profile === "string" ? query.profile : undefined}
        initialFeeReviewMonth={typeof query.feeReview === "string" ? query.feeReview : undefined}
        initialOpportunityId={typeof query.opportunity === "string" ? query.opportunity : undefined}
        pageKind="profiles"
      />
  );
}
