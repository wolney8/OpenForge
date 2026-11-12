import { forwardRef, type HTMLAttributes, type ReactNode, type Ref } from "react";
import styles from "@/components/design-lab-today.module.css";

export const designTodayTaskCollectionClass = styles.collection;
export const designTodayPriorityGroupClass = styles.priorityGroup;
export const designTodayTaskListClass = styles.taskList;
export const designTodayPaginationClass = styles.pagination;
export const designTodayContentClass = styles.content;
export const designTodayWithDetailClass = styles.withDetail;
export const designTodayQueueClass = styles.queue;
export const designTodayCollectionHeadingClass = styles.collectionHeading;
export const designTodayDetailPaneClass = styles.detailPane;
export const designTodayBoardClass = styles.board;
export const designTodayBoardColumnClass = styles.boardColumn;
export const designTodayBoardControlsClass = styles.boardControls;
export const designTodayViewToggleClass = styles.viewToggle;
export const designTodayDetailContentClass = styles.detailContent;
export const designTodayDetailHeadClass = styles.detailHead;
export const designTodayPropertiesClass = styles.properties;
export const designTodayDetailTextClass = styles.detailText;
export const designTodayDetailActionsClass = styles.detailActions;
export const designTodayCloseButtonClass = styles.closeButton;
export const designTodayBoardDrawerClass = styles.boardDrawer;
export const designTodayBoardWithDetailClass = styles.boardWithDetail;
export const designTodayMobileDetailClass = styles.mobileDetail;
export const designTodayRootClass = styles.today;
export const designTodayToolButtonClass = styles.toolButton;
export const designTodayBulkTrackClass = styles.bulkTrack;
export const designTodayTaskWithActionClass = styles.taskWithAction;
export const designTodayStateEditorClass = styles.stateEditor;
export const designTodayPrimaryActionClass = styles.primaryAction;
export const designTodaySuggestionTriggerClass = styles.suggestionTrigger;
export const designTodayOpportunityClass = styles.opportunityRow;
export const designTodayCollectionFooterClass = styles.collectionFooter;
export const designTodayOpportunitySummaryClass = styles.opportunitySummary;

export function DesignTodayToolbar({ actions, dataPdId, summary }: { actions: ReactNode; dataPdId: string; summary: ReactNode }) {
  return <div className={styles.toolbar} data-pd-id={dataPdId}>
    <div className={styles.summary}>{summary}</div>
    <div className={styles.toolbarActions}>{actions}</div>
  </div>;
}

export function DesignTodayFilters({ children, dataPdId }: { children: ReactNode; dataPdId: string }) {
  return <section aria-label="Task Filters" className={styles.filters} data-pd-id={dataPdId}>{children}</section>;
}

export function DesignTodayViewToggle({ layout, onChange, dataPdId }: { layout: "List" | "Board"; onChange: (layout: "List" | "Board") => void; dataPdId: string }) {
  return <div aria-label="Task Layout" className={styles.viewToggle} data-pd-id={dataPdId} role="group">
    <button aria-pressed={layout === "List"} onClick={() => onChange("List")} type="button">List</button>
    <button aria-pressed={layout === "Board"} onClick={() => onChange("Board")} type="button">Board</button>
  </div>;
}

export function DesignTodayDetail({ children, dataPdId, eyebrow, headingRef, onClose, title, urgent = false }: {
  children: ReactNode;
  dataPdId: string;
  eyebrow: ReactNode;
  headingRef?: Ref<HTMLHeadingElement>;
  onClose: () => void;
  title: string;
  urgent?: boolean;
}) {
  return <div className={`${styles.detailContent}${urgent ? ` ${styles.detailUrgent}` : ""}`} data-pd-id={dataPdId}>
    <header className={styles.detailHead}><div><small>{eyebrow}</small><h2 ref={headingRef} tabIndex={headingRef ? -1 : undefined}>{title}</h2></div>
      <button aria-label="Close Task Details" className={styles.closeButton} onClick={onClose} type="button"><span aria-hidden="true" className="material-symbols-outlined">close</span></button>
    </header>
    {children}
  </div>;
}

export const DesignTodayBoard = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement> & { dataPdId: string }>(function DesignTodayBoard({ children, dataPdId, ...props }, ref) {
  return <div aria-label="Task Board" className={styles.board} data-pd-id={dataPdId} ref={ref} role="region" tabIndex={0} {...props}>{children}</div>;
});

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
