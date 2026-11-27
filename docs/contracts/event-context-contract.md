# Planning Contract: Reviewed Event Windows and Cadence Context

_Draft requirement reconciliation: 2026-11-27; issue #28, consumed by #68/#72/#86. No external event feed or calendar runtime is approved._

Manual, source-cited named sporting/special events may provide context for a reviewed routine. Preserve stable event identity, source, checked-at time, timezone, occurrence/window and postponed, cancelled or superseded status. Daily, monthly, yearly and seasonal views must display the same underlying reviewed windows; a view is not evidence of an offer.

An event revision may move or invalidate future routine occurrences only through a defined, idempotent relationship to their window identity. Completed/skipped historical occurrences and source snapshots remain visible. A postponed event must not duplicate an alert; a cancelled event must not silently mark its related task complete. For uncertain or stale dates, say what needs verification. Upcoming fixtures and annual events may suggest checking a saved routine, never assert current promotion availability, Profile eligibility or profit.

Before implementation decide: event source authority and manual review policy; date precision and timezone/DST interpretation; identity across postponement/renaming; future-occurrence rescheduling and alert de-duplication; stale-source threshold; whether any external calendar feed/search is permitted. Historical seasonality may be an explainable optional input only after source period and confidence are explicit. It cannot change deterministic workbook calculations or silently weight recommendations. Synthetic event cases are in the [cross-stage fixture spec](../fixture-specs/account-routine-event-advisory-fixture-spec.md).
