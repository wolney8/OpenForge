import Link from "next/link";
import type { MouseEvent } from "react";
import { DesignLabTaskState } from "@/components/design-lab-task-state";
import { DesignTrackedTaskRow } from "@/components/design-tracked-task-row";
import type { TaskAnnotation } from "@/lib/task-annotations";
import type { TrackedTaskContext } from "@/lib/tracked-task-context";

export function TrackedTaskCard({ item, context, taskHref, onUntrack, pending = false, onNavigate }: {
  item: TaskAnnotation;
  context?: TrackedTaskContext;
  taskHref: string;
  onUntrack?: (event: MouseEvent<HTMLButtonElement>) => void;
  pending?: boolean;
  onNavigate?: (event: MouseEvent<HTMLAnchorElement>, href: string) => void;
}) {
  const active = item.source_status === "active";
  const sourceHref = context?.href;
  const actionHref = sourceHref && (active || item.source_status === "resolved") ? sourceHref : taskHref;
  const actionLabel = active && sourceHref ? "Resolve Source" : item.source_status === "resolved" && sourceHref ? "View Source" : "View Task";
  const sourceState = item.source_status === "resolved" ? "Source resolved" : item.source_status === "changed" ? "Source changed · review task history" : item.source_status === "unavailable" ? "Source unavailable · review task history" : null;
  return <DesignTrackedTaskRow
    action={<Link href={actionHref} onClick={onNavigate ? event => onNavigate(event, actionHref) : undefined}>{actionLabel}</Link>}
    context={<>{item.profile_name}{context?.task?.notification.bookmaker_label || context?.bookmakerLabel ? ` · ${context.task?.notification.bookmaker_label || context.bookmakerLabel}` : ""}{active && context?.task?.dueLabel ? ` · ${context.task.dueLabel}` : ""}</>}
    dataPdId={`tracked-task.${item.profile_id}.${item.occurrence_key}`}
    details={sourceState ? <small>{sourceState}</small> : active && context?.task?.priority === "high" ? <small>High priority · source review</small> : null}
    onUntrack={event => onUntrack?.(event)} pending={pending} state={<DesignLabTaskState state={item.work_state} />}
    title={<Link href={taskHref} onClick={onNavigate ? event => onNavigate(event, taskHref) : undefined}>{item.title}</Link>}
    untrackLabel={`Untrack ${item.title} — ${item.profile_name}`} urgent={active && context?.task?.priority === "high"} variant={onNavigate ? "popup" : "banner"}
  />;
}
