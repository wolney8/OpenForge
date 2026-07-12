"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiBaseUrl } from "@/lib/api";
import {
  getAllAccountNames,
  getDistinctGroups,
  getDistinctPlatforms,
  type AccountAuthorityRecord,
} from "@/lib/account-authorities";
import { dedupeOptions } from "@/lib/workbook-options";

export function AccountAuthoritySettings({ profileId }: { profileId: string }) {
  const [rows, setRows] = useState<AccountAuthorityRecord[]>([]);
  const [statusMessage, setStatusMessage] = useState("Loading account authorities...");
  const [errorMessage, setErrorMessage] = useState("");

  const loadRows = useCallback(async () => {
    const response = await fetch(`${apiBaseUrl}/profiles/${profileId}/accounts`, {
      cache: "no-store",
    });
    if (!response.ok) {
      throw new Error("Unable to load account authorities.");
    }

    const data = (await response.json()) as AccountAuthorityRecord[];
    setRows(data);
    setStatusMessage(`Loaded ${data.length} account authority rows for this profile.`);
  }, [profileId]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadRows().catch((error: Error) => {
        setErrorMessage(error.message);
        setStatusMessage("Account authorities could not be loaded.");
      });
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadRows]);

  const accountNames = useMemo(() => dedupeOptions(getAllAccountNames(rows)), [rows]);
  const groupNames = useMemo(() => dedupeOptions(getDistinctGroups(rows)), [rows]);
  const platformNames = useMemo(() => dedupeOptions(getDistinctPlatforms(rows)), [rows]);

  return (
    <section className="content-subpanel stack" aria-label="Account authority settings">
      <div className="stack">
        <span className="eyebrow">Account, group, and platform authorities</span>
        <p className="lede">
          The Fund Manager owns the authority to add, remove, and modify profile accounts,
          groups, and platforms. Tracker forms should read from these authorities rather
          than inventing isolated local lists.
        </p>
      </div>
      <div className="table-status" aria-live="polite">
        {statusMessage}
      </div>
      {errorMessage ? (
        <p className="error-text" role="alert">
          {errorMessage}
        </p>
      ) : null}
      <div className="meta-grid">
        <dl>
          <dt>Accounts</dt>
          <dd>{accountNames.length}</dd>
        </dl>
        <dl>
          <dt>Groups</dt>
          <dd>{groupNames.length}</dd>
        </dl>
        <dl>
          <dt>Platforms</dt>
          <dd>{platformNames.length}</dd>
        </dl>
      </div>
      <div className="form-grid">
        <label className="field-control">
          <span>Accounts currently available</span>
          <textarea readOnly rows={Math.max(4, Math.min(10, accountNames.length || 4))} value={accountNames.join("\n")} />
        </label>
        <label className="field-control">
          <span>Groups currently available</span>
          <textarea readOnly rows={Math.max(4, Math.min(10, groupNames.length || 4))} value={groupNames.join("\n")} />
        </label>
        <label className="field-control">
          <span>Platforms currently available</span>
          <textarea
            readOnly
            rows={Math.max(4, Math.min(10, platformNames.length || 4))}
            value={platformNames.join("\n")}
          />
        </label>
      </div>
    </section>
  );
}
