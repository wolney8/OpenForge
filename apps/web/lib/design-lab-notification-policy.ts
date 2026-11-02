import { labTaskSourceType, type LabTodayTask } from "./design-lab-operations";

export type LabNotificationEvent = {
  id: string;
  task: LabTodayTask;
  kind: "free_bet_expiry" | "partial_lay_follow_up" | "settlement_review" | "account_review";
  priority: "Action Required" | "Other Source Events";
  severity: "urgent" | "review";
};

// Lab presentation policy only. CP-049 still includes settlement/account review
// in the normal Notification Centre; they remain in All Notifications here.
export function buildLabNotificationEvents(tasks: LabTodayTask[]): LabNotificationEvent[] {
  const events = tasks.flatMap((task): LabNotificationEvent[] => {
    if (!task.sourceId || task.group !== "Needs Action") return [];
    const source = labTaskSourceType(task);
    const kind = source === "Free Bet" ? "free_bet_expiry"
      : source === "Account" ? "account_review"
      : task.requiresImmediateReview ? "partial_lay_follow_up" : "settlement_review";
    const priority = kind === "free_bet_expiry" || kind === "partial_lay_follow_up" ? "Action Required" : "Other Source Events";
    return [{ id: `${task.id}:${kind}`, task, kind, priority, severity: priority === "Action Required" ? "urgent" : "review" }];
  });
  return [...new Map(events.map(event => [event.id, event])).values()];
}

export function activeLabNotificationEvents(events: LabNotificationEvent[], liveTasks: LabTodayTask[], scope: string): LabNotificationEvent[] {
  const liveIds = new Set(buildLabNotificationEvents(liveTasks).map(event => event.id));
  return events.filter(event => liveIds.has(event.id) && (scope === "all" || event.task.profileId === scope));
}
