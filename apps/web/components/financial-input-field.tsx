"use client";

import { ContextHelp } from "@/components/context-help";
import { FinancialTextInput } from "@/components/financial-text-input";

export function FinancialInputField({
  dataPdId,
  error,
  help,
  id,
  label,
  onChange,
  value,
}: {
  dataPdId: string;
  error?: string | null;
  help?: string;
  id: string;
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  const errorId = `${id}-error`;

  return (
    <div className="field-control financial-input-field financial-input-field-compact">
      <span className="field-control-label-row">
        <label htmlFor={id}>{label}</label>
        {help ? <ContextHelp label={`Help with ${label}`} text={help} /> : null}
      </span>
      <FinancialTextInput
        allowNegative={false}
        ariaDescribedBy={error ? errorId : undefined}
        ariaInvalid={Boolean(error)}
        ariaLabel={label}
        dataPdId={dataPdId}
        id={id}
        onBlur={() => undefined}
        onChange={onChange}
        sanitizeInput={false}
        value={value}
      />
      {error ? <small className="error-text" id={errorId}>{error}</small> : null}
    </div>
  );
}
