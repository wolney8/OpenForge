export function CalculatorSegmentedControl<T extends string>({
  ariaLabel,
  dataPdId,
  onChange,
  options,
  value,
}: {
  ariaLabel: string;
  dataPdId?: string;
  onChange: (value: T) => void;
  options: readonly { label: string; value: T }[];
  value: T;
}) {
  return (
    <div
      aria-label={ariaLabel}
      className="extra-place-bet-type-toggle"
      data-pd-id={dataPdId}
      role="group"
    >
      {options.map((option) => (
        <button
          aria-pressed={value === option.value}
          className="extra-place-bet-type-toggle-option"
          key={option.value}
          onClick={() => onChange(option.value)}
          type="button"
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
