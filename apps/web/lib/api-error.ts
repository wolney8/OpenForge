type ApiValidationIssue = {
  loc?: unknown[];
  msg?: unknown;
};

function formatValidationIssue(issue: ApiValidationIssue): string {
  const location = Array.isArray(issue.loc)
    ? issue.loc
        .filter((part) => part !== "body" && part !== "catalogue")
        .map(String)
        .join(" › ")
    : "";
  const message = typeof issue.msg === "string" ? issue.msg : "Invalid value";
  return location ? `${location}: ${message}` : message;
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
