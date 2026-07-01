import Link from "next/link";
import { trackerModuleCards } from "@/lib/tracker-modules";

type TrackerModuleNavProps = {
  activeHref: string;
  profileId: string;
};

export function TrackerModuleNav({
  activeHref,
  profileId,
}: TrackerModuleNavProps) {
  return (
    <nav aria-label="Module sections" className="tracker-nav module-nav">
      {trackerModuleCards.map((module) => {
        const isActive = module.href === activeHref;

        return (
          <Link
            aria-current={isActive ? "page" : undefined}
            className={`nav-pill ${isActive ? "is-active" : ""}`}
            href={`/profiles/${profileId}/tracker/${module.href}`}
            key={module.href}
          >
            {module.title}
          </Link>
        );
      })}
    </nav>
  );
}
