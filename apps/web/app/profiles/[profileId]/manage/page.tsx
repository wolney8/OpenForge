import { FundManagerProfileManagement } from "@/components/fund-manager-profile-management";

export default async function ProfileManagementPage({
  params,
}: {
  params: Promise<{ profileId: string }>;
}) {
  const { profileId } = await params;
  return <FundManagerProfileManagement profileId={profileId} />;
}
