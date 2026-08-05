# Profile Dashboard Future Enhancements

Status: deferred, not required for the current issue-61 dashboard sign-off.

The profile dashboard now provides a higher-density portfolio view using existing tracker summary data. Keep future additions bounded so the dashboard remains a daily operating surface rather than a second reports page.

## Candidate additions

- Expand internal peer comparison with true cross-profile averages once the profile dashboard can consume the Fund Manager aggregate dataset without duplicating summary fetches.
- Add compact bar or donut comparisons for peer-relative sportsbook, free-bet, casino, and cash-adjustment performance.
- Add target-engine recommendations from M12 as advisory text or chips beside weekly, monthly, and annual targets.
- Add a fee-centre shortcut from the dashboard fee card into the exact selected profile/month where fees are ready, blocked, or already withdrawn.
- Add bookmaker trend sparklines for selected-range P&L by bookmaker, limited to the top few contributors to avoid clutter.
- Add drill-through actions from Operational Focus cards into filtered ledger states, preserving the selected tracker range where appropriate.
- Add optional dashboard display density controls only if the current layout becomes overloaded in smoke testing.

## Guardrails

- Do not add new financial calculations here. Dashboard visuals must transform existing `summarizeTrackerData` or approved fee-period outputs.
- Do not show peer averages unless they are backed by actual active-profile summaries.
- Do not add external market or odds comparison data to this profile dashboard.
- Prefer a concise visual summary with links to the ledger/report that owns the detailed workflow.
