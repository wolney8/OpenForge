import Link from "next/link";
import { notFound } from "next/navigation";
import { SportsbookWorkflowShell } from "@/components/sportsbook-workflow-shell";
import { TrackerModuleNav } from "@/components/tracker-module-nav";
import { TrackerModuleTable } from "@/components/tracker-module-table";
import { trackerModuleDefinitions, trackerTableModules } from "@/lib/tracker-modules";
import { getModuleRows, getProfile } from "@/lib/tracker-data";
import type { TrackerModuleKey } from "@/lib/tracker-types";

type TrackerModulePageProps = {
  params: Promise<{
    profileId: string;
    module: keyof typeof trackerModuleDefinitions;
  }>;
};

export default async function TrackerModulePage({
  params,
}: TrackerModulePageProps) {
  const { profileId, module } = await params;
  const profile = await getProfile(profileId);
  const moduleDefinition = trackerModuleDefinitions[module];

  if (!profile || !moduleDefinition) {
    notFound();
  }

  const hasTable = trackerTableModules.has(module as TrackerModuleKey);

  const dataRows = hasTable
    ? await getModuleRows(profileId, module as TrackerModuleKey)
    : [];

  return (
    <main className="page-shell stack">
      <section className="content-panel stack">
        <span className="eyebrow">
          /profiles/{profile.profileId}/tracker/{module}
        </span>
        <h1>
          {profile.displayName}: {moduleDefinition.title}
        </h1>
        <p className="lede">{moduleDefinition.summary}</p>
        <div className="meta-grid">
          <dl>
            <dt>Profile context</dt>
            <dd>{profile.profileCode}</dd>
          </dl>
          <dl>
            <dt>Implementation state</dt>
            <dd>
              {hasTable
                ? "Tabular shell with local workbook seed rows"
                : "Summary surface still pending"}
            </dd>
          </dl>
        </div>
        <TrackerModuleNav activeHref={module} profileId={profile.profileId} />
        <div className="tracker-nav">
          <Link href={`/profiles/${profile.profileId}/tracker`}>
            Back to tracker
          </Link>
          <Link href={`/profiles/${profile.profileId}/tracker/dashboard`}>
            Dashboard
          </Link>
        </div>
      </section>
      {module === "sportsbook-bets" ? (
        <SportsbookWorkflowShell profileId={profile.profileId} />
      ) : hasTable ? (
        <TrackerModuleTable
          addLabel={moduleDefinition.addLabel!}
          columns={moduleDefinition.columns!}
          rows={dataRows}
        />
      ) : (
        <section className="content-panel stack">
          <p className="lede">
            This route remains deferred until reporting and calculation slices are
            implemented. The current momentum is focused on operational tracker rows.
          </p>
        </section>
      )}
    </main>
  );
}
