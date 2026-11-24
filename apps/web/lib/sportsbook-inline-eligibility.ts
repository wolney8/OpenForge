/** A placement changes the authority of Account and settling-time edits. */
export function sportsbookPlanningFieldEditable(record: Record<string, unknown>): boolean {
  if (!["Prospecting", "Not Placed"].includes(String(record.status ?? ""))) return false;
  if (String(record.actual_accepted_back_odds ?? "").trim()) return false;
  if (record.back_placement_confirmed === true) return false;
  if (String(record.lay_matched_stake_1 ?? "").trim()) return false;
  if (record.multi_lay_actual) return false;
  return true;
}
