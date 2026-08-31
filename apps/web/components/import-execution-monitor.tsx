"use client";

import { useEffect } from "react";
import { apiBaseUrl } from "@/lib/api";
import { FUND_MANAGER_NOTIFICATIONS_REFRESH_EVENT } from "@/lib/notifications";
import { beginShellLoading, endShellLoading } from "@/lib/shell-loading";
import { redirectExpiredSession } from "@/lib/session-inactivity";

export const IMPORT_EXECUTION_REFRESH_EVENT = "plum-duff:import-execution-refresh";

type ImportExecution = {
  import_run_id: string;
  status: string;
};

export function ImportExecutionMonitor() {
  useEffect(() => {
    let stopped = false;
    let timerId: number | undefined;
    let running = false;

    const schedule = (delay: number) => {
      if (stopped) return;
      timerId = window.setTimeout(() => void tick(), delay);
    };

    const tick = async () => {
      if (stopped || running) return;
      running = true;
      try {
        const response = await fetch(`${apiBaseUrl}/fund-manager/import-executions`, {
          cache: "no-store",
          credentials: "include",
        });
        if (redirectExpiredSession(response)) {
          stopped = true;
          endShellLoading();
          return;
        }
        if (!response.ok) throw new Error("Unable to load active imports");
        const executions = (await response.json()) as ImportExecution[];
        if (!executions.length) {
          endShellLoading();
          schedule(30_000);
          return;
        }
        beginShellLoading();
        for (const execution of executions) {
          const advanceResponse = await fetch(
            `${apiBaseUrl}/fund-manager/import-executions/${execution.import_run_id}/advance`,
            { method: "POST", credentials: "include" }
          );
          if (redirectExpiredSession(advanceResponse)) {
            stopped = true;
            endShellLoading();
            return;
          }
          if (!advanceResponse.ok) throw new Error("Unable to advance an active import");
          const next = (await advanceResponse.json()) as ImportExecution;
          window.dispatchEvent(
            new CustomEvent(IMPORT_EXECUTION_REFRESH_EVENT, {
              detail: { importRunId: execution.import_run_id, status: next.status },
            })
          );
          if (next.status !== "RUNNING") {
            window.dispatchEvent(new Event(FUND_MANAGER_NOTIFICATIONS_REFRESH_EVENT));
          }
        }
        schedule(350);
      } catch {
        endShellLoading();
        schedule(30_000);
      } finally {
        running = false;
      }
    };

    const runNow = (event: Event) => {
      if (event instanceof CustomEvent && event.detail?.importRunId) return;
      if (timerId !== undefined) window.clearTimeout(timerId);
      schedule(0);
    };

    void tick();
    window.addEventListener(IMPORT_EXECUTION_REFRESH_EVENT, runNow);
    window.addEventListener("focus", runNow);
    return () => {
      stopped = true;
      if (timerId !== undefined) window.clearTimeout(timerId);
      window.removeEventListener(IMPORT_EXECUTION_REFRESH_EVENT, runNow);
      window.removeEventListener("focus", runNow);
      endShellLoading();
    };
  }, []);

  return null;
}
