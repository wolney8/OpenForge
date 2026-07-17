# Plum Duff Data Safety Rules

## Workbook sensitivity

- Treat the uploaded workbook and extracted tracker data as sensitive.
- Do not copy raw workbook content into committed docs or fixtures unless explicitly approved.
- Prefer summaries, field maps, and anonymised examples.

## Synthetic examples only

Use placeholders such as:

- `USER-001`
- `demo@example.invalid`
- `Bookmaker A`
- `Exchange A`
- `Demo Offer`
- `DEMO-CODE-001`

## Fixture and sample data rules

- Fixtures must be synthetic or anonymised.
- Do not preserve real names, emails, addresses, phone numbers, account identifiers, bet references, or transaction references.
- Do not include raw session tokens, cookies, screenshots, or browser storage dumps.

## Credentials and secrets

Never store:

- real passwords
- bookmaker login details
- exchange login details
- bank login details
- MFA secrets
- session cookies
- API tokens copied from private systems

## Financial identifiers

Never store:

- full card numbers
- full bank account details unless later explicitly approved and properly protected
- payment wallet secrets

## Screenshots and attachments

- Do not commit screenshots containing sensitive workbook or account data.
- Do not commit raw exports or email attachments unless explicitly approved.
- If a screenshot is required for debugging later, redact it first.

## Local-only raw data handling

- `_input/` is treated as sensitive local input.
- `data/raw/`, `data/private/`, and `data/exports/` are local-only and ignored by Git.
- Do not move workbook-derived raw data into versioned reference docs without approval.

## Safe outputs

Preferred committed outputs are:

- field inventories
- formula maps
- workflow maps
- anonymised fixtures
- derived contracts
- redacted planning notes

## Approval boundary

If a task appears to require real personal or operational data, stop and ask for explicit approval plus handling constraints before proceeding.
