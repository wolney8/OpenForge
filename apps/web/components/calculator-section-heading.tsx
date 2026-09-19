import type { ReactNode } from "react";

export function CalculatorSectionHeading({
  action,
  className,
  title,
}: {
  action?: ReactNode;
  className?: string;
  title: ReactNode;
}) {
  return <header className={`calculator-section-heading${className ? ` ${className}` : ""}`}>
    <h3>{title}</h3>
    {action}
  </header>;
}
