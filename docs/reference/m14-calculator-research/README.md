# M14 External Calculator Research

Status: Reviewed and classified; targeted follow-up remains
Access date: 2026-07-14

This folder stores observation packets for public calculator modes requested in M14.

Evidence policy used:
- `Observed`: read directly from rendered calculator outputs after synthetic input entry.
- `Inferred`: only used when a formula hypothesis reproduces observed values.
- `To confirm`: used where controls were non-reactive, inaccessible, or ambiguous.

OpenForge review policy:

- Raw packet `validation_state: pass` means the browser observation completed;
  it does not mean the formula or OpenForge adaptation is approved.
- Implementation readiness is defined in
  `openforge-coverage-review.md` and the classified fixture manifest.
- Only `accepted_reference` cases may be used for external regression
  comparison. They still do not override an owning OpenForge contract.

Important OpenForge constraints:
- Workbook remains authoritative for Tracker cash-first behavior.
- External calculator values are reference values only.
- External equal-profit behavior is not used to overwrite approved workbook contracts.
- Contradictions are noted per packet.

Packet index:
- `teamprofit-normal.packet.json`
- `teamprofit-free-bet-snr.packet.json`
- `teamprofit-refund.packet.json`
- `mbb-matched-betting-comparison.packet.json`
- `mbb-each-way.packet.json`
- `mbb-extra-place.packet.json`
- `mbb-sequential-lay-standard.packet.json`
- `mbb-sequential-lay-lock-in.packet.json`
- `mbb-early-payout-2way-dutch.packet.json`
- `mbb-accumulator-standard.packet.json`
- `mbb-accumulator-each-way.packet.json`
- `mbb-accumulator-rule4.packet.json`
- `mbb-accumulator-selection-notes.packet.json`
- `mbb-odds-converter.packet.json`

Review artefact:

- `openforge-coverage-review.md`

Known limitations captured in packets:
- MatchedBettingBlog risk-free mode on matched-betting calculator returned zeros for tested synthetic values.
- Accumulator calculator summary did not change under scripted input updates for this session; results marked `To confirm`.
- TeamProfit advanced custom slider displayed. Follow-up inspection confirmed a
  `part_lays_toggle` control exists, but no partial-match output cases were
  captured, so that mode remains blocked.
