import { FundManagerProfileManagement } from "@/components/fund-manager-profile-management";

export default async function ProfileManagementPage({
  params,
}: {
  params: Promise<{ profileId: string }>;
}) {
  const { profileId } = await params;
  return <FundManagerProfileManagement profileId={profileId} visualV2={process.env.OPENFORGE_FUND_MANAGER_UX_V2 === "true"} />;
}
