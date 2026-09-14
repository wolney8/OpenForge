import { acknowledgeLayPlan } from "./lay-plan";

/** A save acknowledges its submitted snapshot, not later edits in the open form. */
export function reconcileSavedForm<T extends object>(submitted: T, saved: T, current: T): T {
  const next = { ...saved };
  for (const key of Object.keys(current) as (keyof T)[]) {
    if (!Object.is(current[key], submitted[key])) next[key] = current[key];
    if (String(key) === "lay_plan_json" && !Object.is(current[key], submitted[key])) {
      next[key] = acknowledgeLayPlan(submitted[key], saved[key], current[key]) as T[keyof T];
    }
  }
  return next;
}

export function hasNewerFormEdits<T extends object>(submitted: T, current: T): boolean {
  return (Object.keys(current) as (keyof T)[]).some(key => !Object.is(current[key], submitted[key]));
}
