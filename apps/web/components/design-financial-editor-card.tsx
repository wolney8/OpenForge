import { forwardRef, type ComponentPropsWithoutRef } from "react";

import styles from "@/components/design-lab-financial-workflows.module.css";

/** The Lab's financial workflow card, shared with the governed ledger editors. */
export const DesignFinancialEditorCard = forwardRef<HTMLElement, ComponentPropsWithoutRef<"section">>(
  function DesignFinancialEditorCard({ className = "", ...props }, ref) {
    return <section {...props} className={`${styles.card}${className ? ` ${className}` : ""}`} ref={ref} />;
  }
);
