import type { ChangeEvent } from "react";
import styles from "@/components/design-lab-connected.module.css";

export function DesignLedgerSearch({ dataPdId, lab = false, label, onChange, placeholder, value }: {
  dataPdId: string;
  lab?: boolean;
  label: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  placeholder: string;
  value: string;
}) {
  return <label className={`${styles.ledgerSearch}${lab ? "" : " field-control table-search-field"}`} data-pd-id={dataPdId}>
    <span aria-hidden="true" className="material-symbols-outlined">search</span>
    <input aria-label={label} onChange={onChange} placeholder={placeholder} type="search" value={value} />
  </label>;
}
