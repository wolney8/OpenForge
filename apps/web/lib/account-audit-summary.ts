type AccountAuditSource = {
  action: string;
  payload?: Record<string, unknown>;
  payload_json?: string;
};

export function accountAuditSummary(entry: AccountAuditSource): string {
  let payload = entry.payload;
  if (!payload && entry.payload_json) {
    try {
      const parsed: unknown = JSON.parse(entry.payload_json);
      payload = parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? parsed as Record<string, unknown>
        : {};
    } catch {
      payload = {};
    }
  }
  payload ??= {};
  if (Object.prototype.hasOwnProperty.call(payload, "commission_rate")) {
    const raw = String(payload.commission_rate ?? "").trim();
    if (!raw) return "Base commission recorded as unavailable.";
    const value = Number(raw);
    if (Number.isFinite(value)) return `Base commission set to ${(value * 100).toFixed(2)}%.`;
  }
  if (entry.action === "created" || entry.action === "onboarded") return "Account added to this Profile.";
  if (entry.action === "seeded") return "Synthetic Account fixture created.";
  return "Account details updated.";
}
