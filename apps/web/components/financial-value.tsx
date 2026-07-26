import { formatFinancialValue, moneyTone } from "@/lib/financial-display";

type FinancialValueProps = {
  className?: string;
  label?: string;
  showPositiveSign?: boolean;
  value: number | string;
};

export function FinancialValue({
  className = "",
  label,
  showPositiveSign = false,
  value,
}: FinancialValueProps) {
  const numericValue = typeof value === "number" ? value : Number(value);
  const isValid = Number.isFinite(numericValue);
  const tone = isValid ? moneyTone(numericValue) : "neutral";
  const display = isValid
    ? formatFinancialValue(numericValue, { showPositiveSign })
    : "Unavailable";

  return (
    <span
      aria-label={label ? `${label}: ${display}` : undefined}
      className={`financial-value financial-value-${tone}${className ? ` ${className}` : ""}`}
      data-money-tone={tone}
    >
      {display}
    </span>
  );
}

