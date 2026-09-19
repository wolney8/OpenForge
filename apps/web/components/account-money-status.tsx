import type { AccountMoneyIssue } from "@/lib/account-money";

type IssueGroup = { accountId: string; accountName: string; fields: string[] };

function groupIssues(issues: AccountMoneyIssue[]): IssueGroup[] {
  const grouped = new Map<string, IssueGroup>();
  for (const issue of issues) {
    const key = `${issue.accountId}:${issue.accountName}`;
    const group = grouped.get(key) ?? {
      accountId: issue.accountId,
      accountName: issue.accountName,
      fields: [],
    };
    const field = issue.field === "current_balance" ? "current balance" : "pending withdrawal";
    if (!group.fields.includes(field)) group.fields.push(field);
    grouped.set(key, group);
  }
  return [...grouped.values()].sort((left, right) =>
    left.accountName.localeCompare(right.accountName)
  );
}

function MoneyIssueDisclosure({
  issues,
  severity,
}: {
  issues: AccountMoneyIssue[];
  severity: "warning" | "error";
}) {
  if (issues.length === 0) return null;
  const groups = groupIssues(issues);
  const invalid = severity === "error";
  const label = invalid
    ? `Account cash information is invalid for ${groups.length} ${groups.length === 1 ? "Account" : "Accounts"}.`
    : `Account cash information is incomplete for ${groups.length} ${groups.length === 1 ? "Account" : "Accounts"}.`;

  return (
    <details
      className={`account-money-status account-money-status-${severity}`}
      data-pd-id={`account-money.${invalid ? "invalid" : "incomplete"}`}
      aria-atomic="true"
      aria-live={invalid ? "assertive" : "polite"}
    >
      <summary>
        <span aria-hidden="true" className="material-symbols-outlined">
          {invalid ? "error" : "warning"}
        </span>
        <span>{label}</span>
        <span className="account-money-status-action">View affected Accounts</span>
      </summary>
      <ul>
        {groups.map((group) => (
          <li key={group.accountId}>
            <strong>{group.accountName}</strong>
            <span>{invalid ? "Invalid" : "Not recorded"}: {group.fields.join(" and ")}</span>
          </li>
        ))}
      </ul>
    </details>
  );
}

/** Compact cash-data status; unknown observations remain distinct from malformed money. */
export function AccountMoneyStatus({ issues }: { issues?: AccountMoneyIssue[] }) {
  if (!issues?.length) return null;
  const invalid = issues.filter((issue) => issue.reason !== "Unknown amount");
  const unknown = issues.filter((issue) => issue.reason === "Unknown amount");
  return (
    <div className="account-money-status-list">
      <MoneyIssueDisclosure issues={invalid} severity="error" />
      <MoneyIssueDisclosure issues={unknown} severity="warning" />
    </div>
  );
}
