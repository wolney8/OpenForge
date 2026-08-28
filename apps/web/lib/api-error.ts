type ApiValidationIssue = {
  loc?: unknown[];
  msg?: unknown;
  input?: unknown;
};

function formatRejectedInput(input: unknown): string {
  if (typeof input === "string" || typeof input === "number" || typeof input === "boolean") {
    return ` (received: ${String(input)})`;
  }
  return "";
}

function formatValidationIssue(issue: ApiValidationIssue): string {
  const location = Array.isArray(issue.loc)
    ? issue.loc
        .filter((part) => part !== "body" && part !== "catalogue")
        .map(String)
        .join(" › ")
    : "";
  const message = typeof issue.msg === "string" ? issue.msg : "Invalid value";
  const rejectedInput = formatRejectedInput(issue.input);
  return location ? `${location}: ${message}${rejectedInput}` : `${message}${rejectedInput}`;
}

export function formatApiErrorBody(body: string, fallback = "Request failed."): string {
  if (!body.trim()) return fallback;
  try {
    const parsed = JSON.parse(body) as { detail?: unknown };
    if (typeof parsed.detail === "string" && parsed.detail.trim()) return parsed.detail;
    if (Array.isArray(parsed.detail)) {
      const messages = parsed.detail
        .filter((issue): issue is ApiValidationIssue => Boolean(issue && typeof issue === "object"))
        .map(formatValidationIssue);
      return messages.length ? messages.join(". ") : fallback;
    }
    return fallback;
  } catch {
    return body.trim() || fallback;
  }
}
