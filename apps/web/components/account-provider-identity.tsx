import type { MasterAccountCatalogueRecord } from "@/lib/bookmaker-catalogue";

export function AccountProviderIdentity({
  fallbackName,
  provider,
}: {
  fallbackName: string;
  provider: MasterAccountCatalogueRecord | null;
}) {
  const label = provider?.short_display_name || provider?.brand_name || fallbackName || "—";
  return (
    <span
      className={`bookmaker-identity bookmaker-identity-badge${provider ? "" : " bookmaker-identity-badge-fallback"}`}
      style={provider ? {
        backgroundColor: provider.background_colour,
        color: provider.foreground_colour,
      } : undefined}
      title={provider?.brand_name || fallbackName}
    >
      {label}
    </span>
  );
}
