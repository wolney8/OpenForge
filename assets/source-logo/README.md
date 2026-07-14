# Plum Duff Source Logos

Place the original, approved Plum Duff logo files in this folder.

Preferred source files:

- full horizontal or stacked logo as SVG
- compact logo mark as SVG
- transparent PNG or WebP fallbacks
- supplied favicon or app-icon artwork, if available
- light-background and dark-background variants, if they are part of the approved artwork

Use clear filenames, for example:

- `plum-duff-logo.svg`
- `plum-duff-logo-dark.svg`
- `plum-duff-logo-light.svg`
- `plum-duff-mark.svg`
- `plum-duff-logo.png`
- `plum-duff-mark.png`

These files are authoritative source assets. Implementation work must preserve the
original files and must not redraw, recolour, crop, stretch, or overwrite them.
Web-ready copies will later be placed under `apps/web/public/brand/` when the
approved Plum Duff branding issue is implemented.

Do not include drafts, third-party assets, bookmaker logos, or files containing
personal or operational data in this folder.

## Supplied Asset Inventory

| File | Dimensions | Alpha channel | Current assessment |
|---|---:|---:|---|
| `plum-duff-logo-text-dark.png` | 731 x 500 | Yes | Owner-cropped full wordmark; current approved web source |
| `plum-duff-logo-text.png` | 1254 x 1254 | No | Full wordmark on an opaque white background |
| `plum-duff-logo-transparent.png` | 1254 x 1254 | No | Mark with a baked checkerboard; not technically transparent |

The originals must remain unchanged. Before branding implementation, provide a
genuinely transparent mark or explicitly approve deriving a web-ready transparent
copy from the supplied artwork. Any derived copy must live under
`apps/web/public/brand/`, not overwrite these source files, and requires visual
approval before merge.
