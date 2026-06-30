import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";

const primaryRoutes = [
  { href: "/login", label: "Login" },
  { href: "/profiles", label: "Profiles" },
  {
    href: "/profiles/profile-demo-001/tracker/dashboard",
    label: "Tracker",
  },
];

export function AppChrome({ children }: { children: React.ReactNode }) {
  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <div className="app-frame">
        <header className="top-app-bar">
          <div className="brand-lockup">
            <Link className="brand-mark" href="/">
              OF
            </Link>
            <div>
              <div className="brand-title">OpenForge</div>
              <div className="brand-subtitle">
                Local-first profile-scoped tracker
              </div>
            </div>
          </div>
          <nav aria-label="Primary" className="primary-nav">
            {primaryRoutes.map((route) => (
              <Link className="nav-pill" href={route.href} key={route.href}>
                {route.label}
              </Link>
            ))}
          </nav>
          <ThemeToggle />
        </header>
        <div className="main-shell" id="main-content">
          {children}
        </div>
      </div>
    </>
  );
}
