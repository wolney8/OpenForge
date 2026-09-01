"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { AccountProviderIdentity } from "@/components/account-provider-identity";
import { apiBaseUrl } from "@/lib/api";
import {
  findBookmakerCatalogueEntry,
  findMasterAccountCatalogueEntry,
  type BookmakerCatalogueRecord,
  type BookmakerDisplaySettings,
  type MasterAccountCatalogue,
  type MasterAccountCatalogueRecord,
} from "@/lib/bookmaker-catalogue";

export function useBookmakerCatalogue(profileId: string) {
  const [catalogue, setCatalogue] = useState<MasterAccountCatalogueRecord[]>([]);
  const [displaySettings, setDisplaySettings] = useState<BookmakerDisplaySettings | null>(null);
  const [providerIdsByName, setProviderIdsByName] = useState<Record<string, string>>({});

  const reload = useCallback(async () => {
    const [catalogueResponse, settingsResponse, accountsResponse] = await Promise.all([
      fetch(`${apiBaseUrl}/account-catalogue/source`, { cache: "no-store" }),
      fetch(`${apiBaseUrl}/profiles/${profileId}/bookmaker-display-settings`, {
        cache: "no-store",
      }),
      fetch(`${apiBaseUrl}/profiles/${profileId}/accounts`, { cache: "no-store" }),
    ]);
    if (!catalogueResponse.ok || !settingsResponse.ok || !accountsResponse.ok) {
      throw new Error("Unable to load bookmaker brand catalogue.");
    }
    const source = (await catalogueResponse.json()) as MasterAccountCatalogue;
    setCatalogue(source.records);
    setDisplaySettings((await settingsResponse.json()) as BookmakerDisplaySettings);
    const accounts = (await accountsResponse.json()) as Array<{
      account: string;
      catalogue_id?: string | null;
    }>;
    setProviderIdsByName(Object.fromEntries(
      accounts
        .filter((account) => account.catalogue_id && account.account.trim())
        .map((account) => [
          account.account.trim().toLocaleLowerCase(),
          account.catalogue_id as string,
        ])
    ));
  }, [profileId]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void reload(), 0);
    return () => window.clearTimeout(timeoutId);
  }, [reload]);

  return { catalogue, displaySettings, providerIdsByName, reload };
}

export function catalogueIdForBookmaker(
  providerIdsByName: Record<string, string>,
  bookmaker: string
): string | undefined {
  return providerIdsByName[bookmaker.trim().toLocaleLowerCase()];
}

export function BookmakerIdentity({
  bookmaker,
  catalogueId,
  catalogue,
  mode = "Name",
}: {
  bookmaker: string;
  catalogueId?: string | null;
  catalogue: Array<BookmakerCatalogueRecord | MasterAccountCatalogueRecord>;
  mode?: BookmakerDisplaySettings["resolved_mode"];
}) {
  const masterCatalogue = catalogue.filter(
    (entry): entry is MasterAccountCatalogueRecord => "catalogue_id" in entry
  );
  const legacyCatalogue = catalogue.filter(
    (entry): entry is BookmakerCatalogueRecord => "bookmaker_id" in entry
  );
  const masterEntry = findMasterAccountCatalogueEntry(masterCatalogue, {
    catalogueId,
    accountName: bookmaker,
  });
  if (masterEntry) {
    if (mode === "Logo" && masterEntry.logo_asset_path) {
      return (
        <span className="bookmaker-identity bookmaker-identity-logo" title={masterEntry.brand_name}>
          <Image
            alt={masterEntry.brand_name}
            height={32}
            src={masterEntry.logo_asset_path}
            unoptimized
            width={112}
          />
        </span>
      );
    }
    if (mode === "Name") return <span>{masterEntry.brand_name}</span>;
    return <AccountProviderIdentity fallbackName={bookmaker} provider={masterEntry} />;
  }

  const entry = findBookmakerCatalogueEntry(legacyCatalogue, bookmaker);
  if (!entry) {
    return (
      <span className="bookmaker-identity bookmaker-identity-badge bookmaker-identity-badge-fallback">
        {bookmaker || "—"}
      </span>
    );
  }
  if (mode === "Name") {
    return <span>{entry.brand_name}</span>;
  }

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
      {entry.brand_name}
    </span>
  );
}
