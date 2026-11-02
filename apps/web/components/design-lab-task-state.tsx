import type { LabTaskWorkState } from "@/components/design-lab-operations";
import styles from "./design-lab-task-state.module.css";

const stateKey: Record<LabTaskWorkState, string> = {
  "To Do": "todo",
  "In Progress": "progress",
  Blocked: "blocked",
  "Do Later": "later",
  Done: "done",
};

export function DesignLabTaskState({ state }: { state: LabTaskWorkState }) {
  return <span className={styles.chip} data-lab-work-state={stateKey[state]}><span aria-hidden="true" className={styles.dot} />{state}</span>;
}
