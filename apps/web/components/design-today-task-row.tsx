import { forwardRef, type ReactNode } from "react";
import styles from "@/components/design-lab-today.module.css";

export const designTodayTaskCollectionClass = styles.collection;

type DesignTodayTaskRowProps = {
  accessibleName: string;
  active: boolean;
  board?: boolean;
  context: ReactNode;
  controls?: string;
  dataPdId: string;
  date?: ReactNode;
  dateTime?: string;
  extraContext?: ReactNode;
  icon: string;
  onClick: () => void;
  selectionMode: "pressed" | "expanded";
  state?: ReactNode;
  title: string;
  urgent?: boolean;
};

export const DesignTodayTaskRow = forwardRef<HTMLButtonElement, DesignTodayTaskRowProps>(function DesignTodayTaskRow({ accessibleName, active, board = false, context, controls, dataPdId, date, dateTime, extraContext, icon, onClick, selectionMode, state, title, urgent = false }, ref) {
  return <button
    aria-controls={controls}
    aria-expanded={selectionMode === "expanded" ? active : undefined}
    aria-label={accessibleName}
    aria-pressed={selectionMode === "pressed" ? active : undefined}
    className={`${styles.taskRow}${board ? ` ${styles.boardCard}` : ""}${urgent ? ` ${styles.urgent}` : ""}`}
    data-pd-id={dataPdId}
    onClick={onClick}
    ref={ref}
    type="button"
  >
    <span aria-hidden="true" className={`material-symbols-outlined ${styles.rowIcon}`}>{icon}</span>
    <span className={styles.rowMain}><strong>{title}</strong><small>{context}</small>{extraContext}</span>
    {date ? dateTime ? <time className={styles.rowDate} dateTime={dateTime}>{date}</time> : <span className={styles.rowDate}>{date}</span> : null}
    {state ? <span className={styles.rowState}>{state}</span> : null}
    <span aria-hidden="true" className={`material-symbols-outlined ${styles.rowArrow}`}>chevron_right</span>
  </button>;
});
