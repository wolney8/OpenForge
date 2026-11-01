# Profile Exchange commission resolution

Status: implemented; owner acceptance pending.

## Authority

For a Profile Exchange Account, resolve prospective commission in this order:

1. explicit per-bet actual override;
2. one active Account commission offer whose inclusive effective dates cover the placement date;
3. the Profile Exchange Account base commission;
4. an existing governed product preference/default, where that authority is configured;
5. unavailable.

`0.00%` is authoritative zero. Blank is unknown and must never be coerced to zero. Active offers
for one Profile Exchange Account must not overlap.

When a bet becomes committed, its lay plan and financial row retain the resolved rate used at that
time. Later base-rate or offer changes do not rewrite placed or settled history. Imported historic
commission remains unknown unless separately reviewed.

The resolver returns the value and source (`explicit override`, `commission offer`, `Account
default`, governed product default, or unavailable). Oddsmatcher, Bet Summary and Sportsbook use
the same authority; replayed opportunities remain non-actionable.
