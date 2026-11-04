import { ProfileOnboarding } from "@/components/founder-profile-onboarding";

export default function NewProfilePage() {
  const visualV2 = process.env.OPENFORGE_FUND_MANAGER_UX_V2 === "true";
  if (visualV2) return <ProfileOnboarding visualV2 />;
  return (
    <main className="page-shell">
      <ProfileOnboarding />
    </main>
  );
}
