"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { apiBaseUrl } from "@/lib/api";
import {
  findBookmakerCatalogueEntry,
  getBookmakerDisplayLabel,
  type BookmakerCatalogueRecord,
  type BookmakerDisplaySettings,
  type MasterAccountCatalogue,
} from "@/lib/bookmaker-catalogue";

export function useBookmakerCatalogue(profileId: string) {
  const [catalogue, setCatalogue] = useState<BookmakerCatalogueRecord[]>([]);
  const [displaySettings, setDisplaySettings] = useState<BookmakerDisplaySettings | null>(null);

  const reload = useCallback(async () => {
    const [catalogueResponse, settingsResponse] = await Promise.all([
      fetch(`${apiBaseUrl}/account-catalogue/source`, { cache: "no-store" }),
      fetch(`${apiBaseUrl}/profiles/${profileId}/bookmaker-display-settings`, {
        cache: "no-store",
      }),
    ]);
    if (!catalogueResponse.ok || !settingsResponse.ok) {
      throw new Error("Unable to load bookmaker brand catalogue.");
    }
    const masterCatalogue = (await catalogueResponse.json()) as MasterAccountCatalogue;
    setCatalogue(
      masterCatalogue.records
        .filter((record) => record.account_type === "Bookmaker")
        .map((record) => ({
          bookmaker_id: record.catalogue_id,
          brand_name: record.brand_name,
          short_display_name: record.short_display_name,
          legal_operator: record.legal_operator,
          operator_group: record.operator_group,
          platform: record.platform,
          risk_team: record.risk_team,
          licence_reference: record.licence_reference,
          licence_status: record.licence_status,
          canonical_domain: record.canonical_domain,
          status: record.status,
          foreground_colour: record.foreground_colour,
          background_colour: record.background_colour,
          logo_asset_path: record.logo_asset_path,
          source: record.source,
          confidence: record.confidence,
          last_verified_date: record.last_verified_date,
          created_at: record.last_verified_date,
          updated_at: masterCatalogue.updated_at,
        }))
    );
    setDisplaySettings((await settingsResponse.json()) as BookmakerDisplaySettings);
  }, [profileId]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void reload(), 0);
    return () => window.clearTimeout(timeoutId);
  }, [reload]);

  return { catalogue, displaySettings, reload };
}

export function BookmakerIdentity({
  bookmaker,
  catalogue,
  mode = "Name",
}: {
  bookmaker: string;
  catalogue: BookmakerCatalogueRecord[];
  mode?: BookmakerDisplaySettings["resolved_mode"];
}) {
  const entry = findBookmakerCatalogueEntry(catalogue, bookmaker);
  if (!entry || mode === "Name") {
    return <span>{bookmaker || "—"}</span>;
  }

  const label = getBookmakerDisplayLabel(entry);
  if (mode === "Logo" && entry.logo_asset_path) {
    return (
      <span className="bookmaker-identity bookmaker-identity-logo" title={entry.brand_name}>
        <Image
          alt={entry.brand_name}
          height={32}
          src={entry.logo_asset_path}
          unoptimized
          width={112}
        />
      </span>
    );
  }

  return (
    <span
      className="bookmaker-identity bookmaker-identity-badge"
      style={{
        backgroundColor: entry.background_colour,
        color: entry.foreground_colour,
      }}
      title={entry.brand_name}
    >
      {label}
    </span>
  );
}
