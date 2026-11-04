import { ProfileOnboarding } from "@/components/founder-profile-onboarding";

export default function NewProfilePage() {
  return (
    <main className="page-shell">
      <ProfileOnboarding visualV2={process.env.OPENFORGE_FUND_MANAGER_UX_V2 === "true"} />
    </main>
  );
}
