# UI Iconography Protocols

Purpose

- Provide durable guidance so future AI/code contributors follow WCHE-style accessibility and consistency rules for icon usage in OpenForge.

Scope

- Applies to web UI controls, table actions, calculator actions, and any icon-only control.

Protocol 1: Meaning, Semantics, and Accessibility

- Every icon action must have a clear semantic meaning that is reinforced by accessible text.
- Icon-only buttons must include `aria-label` and `title` with action intent.
- Destructive actions must use destructive color treatment and require an explicit confirmation path when data loss is possible.
- Confirmation copy should be plain language and specific, for example: `Are you sure? lay has been entered.`
- Provide undo where feasible for destructive actions.
- Disabled icon actions must be visibly disabled and non-interactive.
- Never rely on color alone to convey meaning; include text label, tooltip, or state copy.

Protocol 2: Visual Sizing, Alignment, and Consistency

- Icon buttons should use consistent hit areas and sizing:
  - Minimum touch target: `2.25rem` square.
  - Internal icon glyph size: `0.9rem` to `1rem` unless a larger icon is required.
- Keep icon glyph optically centered within the button; verify across Chromium/WebKit.
- Prefer SVG path icons over emoji glyphs for alignment consistency.
- Destructive icons should use red/destructive palettes and maintain contrast against backgrounds.
- Place inline action icons next to the field they affect, not in detached columns, when the action is field-specific.

Protocol 3: Behavioral Contracts for Action Icons

- `Copy` action icons/pills:
  - If source value is zero or unavailable, render disabled state.
  - If value is valid, copy should execute deterministic side effect(s) described in UI copy.
- `Delete/Remove` action icons:
  - Trigger a confirmation state in context.
  - Offer cancel and undo.
  - Preserve deterministic state updates and status toasts.
- Status/risk icons/pills:
  - Use documented threshold ranges.
  - Keep displayed values rounded as specified by product rules.

Sportsbook Partial-Lay Specific Rules

- Recommended next lay stake control uses numeric pill text (value itself) and is copyable only when value `> 0`.
- Remove lay leg control uses an inline red bin icon adjacent to matched stake input.
- Remove flow requires confirm + warning + undo.
- Match rating pill thresholds:
  - `<40`: low (red)
  - `40-69`: mid (amber)
  - `70-99`: good (green)
  - `>=100`: ARP-risk tier (focus/purple family)
- Match rating display should use no decimal places.

Verification Checklist

- Icon has accessible name (`aria-label`) and descriptive tooltip (`title`).
- Control is keyboard focusable and operable.
- Disabled state is both visual and behavioral.
- Destructive flow includes confirm and undo.
- Mobile viewport hit target remains adequate.
- Contrast and readability checked in current theme.
