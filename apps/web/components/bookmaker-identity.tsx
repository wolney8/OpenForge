"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { apiBaseUrl } from "@/lib/api";
import {
  findBookmakerCatalogueEntry,
  getBookmakerDisplayLabel,
  type BookmakerCatalogueRecord,
  type BookmakerDisplaySettings,
} from "@/lib/bookmaker-catalogue";

export function useBookmakerCatalogue(profileId: string) {
  const [catalogue, setCatalogue] = useState<BookmakerCatalogueRecord[]>([]);
  const [displaySettings, setDisplaySettings] = useState<BookmakerDisplaySettings | null>(null);

  const reload = useCallback(async () => {
    const [catalogueResponse, settingsResponse] = await Promise.all([
      fetch(`${apiBaseUrl}/bookmaker-catalogue`, { cache: "no-store" }),
      fetch(`${apiBaseUrl}/profiles/${profileId}/bookmaker-display-settings`, {
        cache: "no-store",
      }),
    ]);
    if (!catalogueResponse.ok || !settingsResponse.ok) {
      throw new Error("Unable to load bookmaker brand catalogue.");
    }
    setCatalogue((await catalogueResponse.json()) as BookmakerCatalogueRecord[]);
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
