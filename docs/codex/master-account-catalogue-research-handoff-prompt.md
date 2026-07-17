# Master Account Catalogue Research Handoff Prompt

You are researching public provider metadata for Plum Duff using current web access.

Your task is to update only:

`data/reference/master-account-catalogue.json`

Read first:

- `AGENTS.md`
- `docs/contracts/master-account-catalogue-source-contract.md`
- `data/README.md`
- the existing `data/reference/master-account-catalogue.json`

Do not modify application code, database files, profile records, workbook files, or any other file.
Do not add credentials, personal data, account balances, affiliate links, tracking parameters,
screenshots, cookies, or login information.

Do not change `default_operating_context`; that is a Fund Manager product setting, not an external
research fact.

## Research Goal

Build a maintained catalogue of bookmakers, betting exchanges, and banks relevant to the Fund
Manager's supported operating jurisdictions. Research in reviewable batches. Do not claim the file
is exhaustive unless every target market has been defined and systematically checked.

For each existing or newly added provider, research and fill only facts supported by current public
evidence:

- `catalogue_id`: stable uppercase id; preserve an existing id
- `account_type`: `Bookmaker`, `Exchange`, or `Bank`
- `operating_jurisdictions`: ISO 3166-1 alpha-2 country codes, for example `GB`, `IE`, `US`
- `operating_subdivisions`: ISO 3166-2 codes where availability is subnational, for example `US-NJ`
- `operating_channels`: one or more of `web`, `mobile`, `retail`
- `brand_name` and `short_display_name`
- `legal_operator`
- `operator_group`
- `platform`
- `risk_team`
- `licence_reference` and `licence_status`
- `canonical_domain`, without tracking parameters
- `status`: `Active` or `Archived`
- accessible `foreground_colour` and `background_colour`
- `source`, `confidence`, and `last_verified_date`
- `evidence`

## Code and Channel Rules

- Use `GB`, not `UK`; `IE`, not `IRE`; and `US`, not `USA`.
- Never use `EUR`; it is a currency code, not an operating jurisdiction.
- Do not use `EU` as a shortcut for nationally regulated betting availability. List verified
  countries explicitly.
- US availability must include verified state subdivisions. Do not imply nationwide availability
  from one state licence.
- `web` means customers can use the service through a browser.
- `mobile` means an official supported mobile application or explicitly mobile-only service.
- `retail` means physical betting shops, branches, or stores.
- List all applicable channels explicitly. Do not use `all`.
- Empty jurisdiction/channel arrays mean unknown, not worldwide availability.

## Evidence Standard

Prefer primary sources:

1. official provider terms, eligibility, registration, help, app, or store-locator pages
2. official regulator/licence registers
3. official corporate/operator pages
4. official Apple App Store or Google Play listings for mobile availability

Do not use search-result snippets, affiliate sites, odds-comparison sites, Wikipedia, social media,
or unsourced directories as proof. A regulator licence alone does not prove the provider currently
accepts new customers; use a current provider eligibility/registration source as well where
possible.

Each evidence object must contain:

```json
{
  "source_url": "https://official.example/page",
  "source_title": "Exact page title",
  "publisher": "Provider or regulator name",
  "checked_at": "YYYY-MM-DD",
  "supports": ["operating_jurisdictions", "operating_channels"],
  "notes": "Short explanation of the supported claim"
}
```

Only use `confidence: "Verified"` when current HTTPS evidence supports the populated factual
fields. Use `Likely` for incomplete but credible primary evidence and `Unverified` otherwise.

## Fields to Leave as Stubs

Leave a string as `""`, an array as `[]`, and confidence as `Unverified` when evidence is absent.
In particular:

- Do not infer `risk_team`, shared risk controls, `platform`, or operator relationships from branding
  similarities or common industry claims.
- Do not invent licence references, legal entities, domains, colours, or operating markets.
- Leave `logo_asset_path` empty; do not download or hotlink third-party logos.
- Do not mark a provider Active merely because its website resolves.
- Do not copy a colour pair unless it remains readable at WCAG AA 4.5:1. If official colours do not
  provide sufficient contrast, retain the existing accessible pair and explain it in evidence notes.

## Validation Before Handoff

1. Parse the finished file as JSON.
2. Confirm `schema_version` remains `1.0`.
3. Confirm catalogue ids are unique.
4. Confirm brand names are unique within each account type.
5. Confirm every country code is two uppercase letters and every subdivision is ISO 3166-2 style.
6. Confirm channels contain only `web`, `mobile`, and `retail`.
7. Confirm every Verified record has evidence and every evidence URL uses HTTPS.
8. Confirm no unsupported or sensitive fields were added.

Return a concise handoff listing providers added, providers changed, fields left unknown, evidence
URLs used, validation performed, and any claims requiring human confirmation. Do not present
uncertain claims as facts.
