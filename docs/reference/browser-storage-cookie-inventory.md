# Browser Storage And Cookie Inventory

_Last reviewed: 2026-08-28_

This inventory records browser technologies currently used by Plum Duff. It is the source for the
public Cookie Policy. Do not add analytics, advertising or other optional browser technologies to
the policy until the application actually loads them.

## Strictly Necessary

| Technology | Storage | Purpose | Lifetime |
|---|---|---|---|
| `pd_session` | Secure HttpOnly cookie | Authenticated session and server-side owner authorization | Configured session lifetime; cleared on logout |
| `pd_oauth_state` | Secure HttpOnly cookie | Google OAuth state and PKCE request integrity | 10 minutes; cleared after callback/logout |
| Free Bet bridge | Session storage, scoped by Profile | Carries an explicit Sportsbook-to-Free-Bet prefill between tracker routes | Current browser tab session |
| Session activity/logout signals | Local storage | Coordinates optional inactivity timeout and logout across tabs | Until replaced or browser data is cleared |

The authentication cookies use `SameSite=Lax`, are HttpOnly, and use `Secure` on HTTPS. They are
required for the protected service and are not available to client JavaScript.

## Preferences

| Technology | Storage | Purpose |
|---|---|---|
| Theme and back/lay theme | Local storage | Remembers light/dark and tracker colour preferences |
| Ledger UI state | Local storage | Remembers guided access, table columns, widths and other explicit display choices |
| Notification state | Local storage | Remembers local read/history/preferences until hosted persistence replaces it |
| Casino Quick Add usage | Local storage | Orders compact-entry suggestions from locally used values |
| Inactivity preference | Local storage, scoped by signed-in email | Remembers whether Auto Logout is enabled and its selected duration |
| Required-storage notice | Local storage | Prevents repeatedly showing the same required-storage notice |

These preference values do not create an alternate identity or financial persistence model. Hosted
durability and migration of appropriate preferences belong to the PostgreSQL/Neon workstream.

## Not Present

The current application does not load analytics, advertising, marketing, behavioural tracking,
Stripe browser technology or client error-monitoring technology. Consequently, it does not show
fabricated optional-cookie choices. If optional technology is introduced later, it must be blocked
until the relevant consent decision and this inventory/policy are updated.
