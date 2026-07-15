type AccessScopeBadgeProps = {
  label?: string;
};

export function AccessScopeBadge({ label = "Fund Manager only" }: AccessScopeBadgeProps) {
  return (
    <span
      className="access-scope-badge"
      data-access-tier="internal_operational"
      title="Excluded from future subscriber-facing views unless an approved access policy explicitly allows it"
    >
      <span aria-hidden="true" className="material-symbols-outlined">
        shield_lock
      </span>
      {label}
    </span>
  );
}
