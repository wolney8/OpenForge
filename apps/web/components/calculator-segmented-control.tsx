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
      className="calculator-segmented-control"
      data-pd-id={dataPdId}
      role="group"
    >
      {options.map((option) => (
        <button
          aria-pressed={value === option.value}
          className="calculator-segmented-control-option"
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
