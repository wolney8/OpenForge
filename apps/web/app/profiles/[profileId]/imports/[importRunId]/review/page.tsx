import { FounderImportReviewWorkspace } from "@/components/founder-import-review-workspace";

export default async function ProfileImportReviewPage({
  params,
}: {
  params: Promise<{ profileId: string; importRunId: string }>;
}) {
  const { profileId, importRunId } = await params;
  return (
    <main className="page-shell stack">
      <FounderImportReviewWorkspace importRunId={importRunId} profileId={profileId} />
    </main>
  );
}
