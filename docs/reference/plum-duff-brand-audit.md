# Plum Duff Brand Audit

_Updated: 2026-07-14_

## Scope

- GitHub issue: `#65 Rename OpenForge Platform to Plum Duff and Apply Supplied Branding`
- Contract: `docs/contracts/platform-branding-change-contract.md`
- Source assets: `assets/source-logo/`
- Public web assets: `apps/web/public/brand/`

## Supplied Assets

| Source file | Assessment | Implementation use |
|---|---|---|
| `plum-duff-logo-text-dark.png` | 731 x 500 RGBA | Owner-cropped asset copied unchanged as `plum-duff-wordmark-cropped-v2.png` |
| `plum-duff-logo-text.png` | 1254 x 1254 RGB with white background | Preserved as source only |
| `plum-duff-logo-transparent.png` | 1254 x 1254 RGB with baked checkerboard | Preserved as source only; not treated as transparent |

The implemented source and public copy share SHA-256:

`9a9bcffe798bde369c857dd3be5ed30b5820ab661a96a3627bca1d1e8add4266`

## Applied Branding

- central platform name, description, and primary-logo path
- browser metadata title and description
- top application bar
- home route
- login route
- profiles and selected-profile Tracker through the shared application bar
- current repository agent guidance

## Intentionally Retained Identifiers

The following remain `OpenForge` because they are internal or historical rather than
current user-facing product labels:

- repository name
- package names such as `@openforge/web`
- Python package/module names such as `openforge_api`
- database and environment identifiers
- historical planning records and workbook-deconstruction documents
- Git branch and issue history

Changing those identifiers requires separate approval and migration planning.

## Deferred Asset Work

- No favicon or compact app mark is applied because the supplied mark has no alpha
  channel and includes a baked checkerboard.
- No supplied artwork has been cropped, redrawn, recoloured, or overwritten.
- A genuine transparent mark, SVG, or explicit approval for a derived web copy is
  required before favicon and compact-icon implementation.

## Automated Evidence

- Plum Duff metadata and public logo resolve on Login, Profiles, and Tracker.
- No visible exact `OpenForge` label remains on those routes.
- Login -> Profiles -> selected Profile Tracker route flow remains operational.
- Web lint, typecheck, and unit tests pass.

## Human Review Required

- wordmark scale and clarity in the fixed application bar
- login-page wordmark scale
- contrast in light and dark themes
- final compact mark/favicon choice
