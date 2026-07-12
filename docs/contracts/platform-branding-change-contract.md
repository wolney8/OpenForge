# Branding Contract: Rename Platform to Plum Duff

_Last updated: 2026-07-08_

## 0. Contract status

- Status: Draft
- Owner: Codex planning draft
- Human approval required before implementation: Yes
- Related workflow contract: Platform shell / branding / navigation
- Related source assets: Included logo files
- Related issue/task: `Update platform branding from OpenForge to Plum Duff`
- Financial-calculation impact: None expected
- Human visual approval required before merge: Yes

## 1. Product context

- Current application name: OpenForge
- New application name: Plum Duff
- Tracker module: Tracker
- Oddsmatcher module: Oddsmatcher
- Deprecated/future wording to avoid: OddsForge
- Profile scoped: Yes
- Fund Manager visible? Yes
- Subscriber/profile tracker visible? Yes

This contract covers the full platform branding update from `OpenForge` to `Plum Duff`.

The oddsmatching module must be named:

- `Oddsmatcher`

Do not use:

- `OddsForge`
- `OddsForge Matcher`
- `Odds Matcher` as the module name unless only used descriptively

## 2. Purpose

This contract defines the controlled branding update for the platform.

It ensures that the application consistently presents as `Plum Duff` across:

- login
- profile list
- selected profile tracker
- dashboard
- accounts
- reports
- navigation
- metadata
- documentation
- logo assets
- browser/app icons where available

This contract does not define tracker calculations, account balances, cash-first P&L, sportsbook logic, free-bet logic, casino logic, or database behaviour.

## 3. Workflow context

This task is encountered during platform shell setup, UI polish, product identity work, or pre-demo branding review.

It must be treated as a branding/content/asset task only.

It must not change:

- calculation logic
- profile scoping
- database relationships
- tracker workflows
- cash-first current-value behaviour
- financial reports
- account balances
- sportsbook/free-bet/casino calculations

## 4. Current branding equivalent

Existing references may include:

- `OpenForge`
- `OpenForge Tracker`
- `OddsForge`
- `OddsForge Matcher`
- `Odds Matcher`

Required new references:

- Platform/application: `Plum Duff`
- Tracker area: `Tracker` or `Plum Duff Tracker` where context requires
- Oddsmatching module: `Oddsmatcher`

Historical/archive references may remain only if clearly marked as archive/history.

## 5. Logo source

The AI must use the included logo files.

Expected locations may include:

- `_input/logo/`
- `_input/logos/`
- `assets/source-logo/`
- `public/brand/`
- `public/logos/`

If logo files are missing, stop and report the missing assets.

Do not:

- invent a logo
- generate a new logo
- redraw the logo
- recolour the logo
- change the logo style
- overwrite source logo files

Prefer:

- SVG for app UI if available
- transparent PNG/WebP as fallback
- compact logo mark for favicon/sidebar if included
- full logo for login and main shell

Recommended target paths:

- `public/brand/plum-duff-logo.svg`
- `public/brand/plum-duff-logo.png`
- `public/brand/plum-duff-mark.svg`
- `public/brand/plum-duff-mark.png`
- `public/favicon.ico`
- `public/apple-touch-icon.png`

Only create web-ready copies where needed.

Preserve original source assets.

## 6. Inputs

| Field | Type | Required? | Source | Notes |
|---|---|---:|---|---|
| `current_platform_name` | string | Yes | existing project | expected value: `OpenForge` |
| `new_platform_name` | string | Yes | this contract | required value: `Plum Duff` |
| `oddsmatcher_module_name` | string | Yes | this contract | required value: `Oddsmatcher` |
| `logo_source_files` | file set | Yes | included assets | must be inspected and used |
| `app_shell_files` | file set | Yes | codebase | layout, nav, metadata |
| `public_asset_files` | file set | Yes | codebase | logo and favicon paths |
| `documentation_files` | file set | Yes | docs | current docs only |
| `profile_routes` | route set | Yes | app/router | must continue to work |
| `tracker_routes` | route set | Yes | app/router | must continue to work |

## 7. Outputs

| Field | Type | Used where? | Stored or derived? | Notes |
|---|---|---|---|---|
| `platform_display_name` | string | UI/docs | stored/configured | `Plum Duff` |
| `oddsmatcher_display_name` | string | navigation/docs | stored/configured | `Oddsmatcher` |
| `primary_logo_path` | string | login/shell/nav | stored/configured | path to included logo |
| `logo_mark_path` | string | sidebar/favicon/mobile | stored/configured | if available |
| `favicon_path` | string | browser metadata | stored/configured | if suitable asset exists |
| `updated_metadata` | file changes | app metadata | stored | title/name/theme |
| `updated_navigation_labels` | file changes | nav/sidebar/header | stored | visible product labels |
| `brand_audit_report` | markdown/text | implementation report | derived | replacements and remaining references |

## 8. Required replacements

Replace current user-facing references as follows:

- `OpenForge` → `Plum Duff`
- `OpenForge Tracker` → `Plum Duff Tracker` or `Tracker`
- `OddsForge Matcher` → `Oddsmatcher`
- `Odds Matcher` → `Oddsmatcher` when used as the module name
- `OddsForge` → remove, defer, or archive unless explicitly required

Do not blindly replace inside:

- archived documents
- historical notes
- changelog entries preserving history
- database migrations
- package names
- environment variable names
- calculation contracts unless user-facing
- source comments that intentionally explain old naming

## 9. Areas to update

Update branding where present in:

- login screen
- profile list screen
- selected profile tracker shell
- dashboard
- sidebar
- top navigation
- footer
- page titles
- browser metadata
- app manifest
- favicon/app icons
- loading states
- empty states
- error pages
- report headings
- README current product section
- `AGENTS.md`
- `docs/codex/`
- `docs/planning/`
- current user-facing templates

## 10. Logo application rules

Apply the included logo files to:

- login screen
- main app shell
- Fund Manager profile list
- selected profile tracker shell
- sidebar or top navigation
- favicon/app icon if suitable asset exists
- report header if report exports currently exist

Logo requirements:

- preserve aspect ratio
- avoid stretching
- avoid cropping
- maintain contrast
- use accessible alt text: `Plum Duff`
- centralise paths/config where practical
- do not alter colours without human approval

Fallback rules:

- If only one logo file exists, use it consistently and report missing variants.
- If no logo mark exists, do not generate one unless explicitly approved.
- If no favicon exists, report it as deferred unless a suitable supplied mark exists.

## 11. Assumptions

- `Plum Duff` is the approved platform name.
- `Oddsmatcher` is the approved oddsmatching module name.
- The profile-scoped Tracker remains the first real product surface.
- Branding work must not change tracker logic.
- Included logo files are authoritative.
- Historical references may remain only if clearly archived.

## 12. Non-goals

This contract does not authorise:

- changing cash-first calculations
- changing sportsbook/free-bet/casino logic
- changing database schema
- changing profile isolation
- building Oddsmatcher
- adding scraping
- adding live odds feeds
- adding production SaaS authentication
- generating new logo assets
- changing logo colours
- deleting old assets without approval

## 13. Risk areas

| Risk | Description | Required mitigation |
|---|---|---|
| Partial rename | Some UI still says `OpenForge` | Run full text search and report remaining references |
| Wrong matcher name | Module appears as `OddsForge` | Explicitly search for `OddsForge` and matcher variants |
| Logo misuse | AI invents or edits logo | Use included files only |
| Broken logo path | UI references missing asset | Run build/smoke test |
| Poor contrast | Logo unreadable | Human visual review |
| Historical docs damaged | Useful history overwritten | Only update current docs unless approved |
| Financial regression | Branding task touches calculations | Do not edit calculation modules |
| Profile route regression | Branding breaks profile tracker routing | Run route smoke tests |

## 14. Implementation instructions

Before changing files:

1. Locate included logo files.
2. List all logo files found.
3. Identify primary logo, logo mark, transparent version and favicon candidate if available.
4. Search for current branding references:
   - `OpenForge`
   - `OddsForge`
   - `Odds Matcher`
   - `OddsMatcher`
   - `Oddsmatcher`
5. Propose exact replacement plan.
6. Wait for human approval if changes affect package names, database names, route names, repository name, or environment variables.

Allowed after approval of this contract:

- update user-visible UI text
- update app metadata
- update current documentation branding
- copy logo assets into public brand folder
- update logo imports/paths
- update favicon if suitable supplied asset exists
- update README/product identity text

Requires separate approval:

- repository rename
- package rename
- database table rename
- environment variable rename
- route structure changes
- calculation logic changes
- generated image assets
- logo colour changes
- deleting old assets

## 15. Search checks

Required search command or equivalent:

```bash
grep -RIn "OpenForge\|OddsForge\|Odds Matcher\|OddsMatcher\|Oddsmatcher" \
  . \
  --exclude-dir=node_modules \
  --exclude-dir=.git \
  --exclude-dir=.next \
  --exclude-dir=dist \
  --exclude-dir=build
```

Expected final state:

- current user-facing references to `OpenForge` are replaced with `Plum Duff`
- current user-facing references to `OddsForge` are removed, deferred or archived
- oddsmatching module references use `Oddsmatcher`
- historical/archive references may remain if clearly archived
- logo paths resolve correctly
- app builds successfully

## 16. Test cases

- `brand_login_displays_plum_duff_logo`
- `brand_login_displays_plum_duff_name`
- `brand_profile_list_displays_plum_duff_shell`
- `brand_selected_profile_tracker_uses_plum_duff_shell`
- `brand_sidebar_uses_plum_duff_logo_or_mark`
- `brand_metadata_title_uses_plum_duff`
- `brand_oddsmatcher_label_is_oddsmatcher`
- `brand_no_current_user_facing_openforge_references`
- `brand_no_current_user_facing_oddsforge_matcher_references`
- `brand_logo_assets_exist_at_referenced_paths`
- `brand_profile_routes_still_render`

## 17. Acceptance criteria

Branding update is acceptable only if:

- platform displays as `Plum Duff`
- included logo files are used
- login screen uses new branding
- Fund Manager profile list uses new branding
- selected profile tracker uses new branding
- app shell/nav uses new branding
- oddsmatching module is named `Oddsmatcher`
- current user-facing `OpenForge` references are removed
- current user-facing `OddsForge` references are removed/deferred
- old names remain only in clearly historical/archive material
- no calculation logic changes are introduced
- no profile isolation changes are introduced
- app builds successfully
- relevant UI smoke tests pass
- human visually approves logo placement

## 18. UI display requirements

- Login:
  - show primary `Plum Duff` logo prominently
  - show platform name as `Plum Duff`
  - do not show `OpenForge`

- Profile list:
  - show `Plum Duff` platform shell
  - keep Fund Manager subscriber/profile overview clear

- Tracker shell:
  - show `Plum Duff` shell branding
  - keep selected profile context visible

- Navigation:
  - use `Tracker`
  - use `Oddsmatcher` if the future matcher module is shown
  - do not use `OddsForge`

- Reports:
  - use `Plum Duff` branding if report headers exist
  - preserve selected profile context

## 19. Audit trail requirements

Implementation report must include:

- logo files found
- logo files copied or referenced
- files modified
- files intentionally not modified
- old branding references replaced
- old branding references intentionally retained
- test/build commands run
- any missing logo variants
- unresolved references to `OpenForge`
- unresolved references to `OddsForge`
- screenshots/manual visual checks recommended
- contract version
- timestamp

## 20. Human approval

- reviewer: To confirm
- review date: To confirm
- approval outcome: Pending
- follow-up required before implementation:
  - confirm exact logo files to use
  - confirm whether repository/package names should remain unchanged
  - confirm whether old `OpenForge` references may remain in archive/history docs
  - confirm whether favicon/logo mark is supplied or should be deferred