<!--
PATH: specs/001-virtual-newsroom-mvp/security-review.md
WHAT: Security review checklist and results for MVP routes
WHY: Track concrete controls before Vercel production deploy
RELEVANT: services/api/src/routes/auth-middleware.ts,services/api/src/routes/webhooks.ts,services/api/src/routes/cron.ts,services/api/src/routes/docs.ts
-->

# Security Review: Virtual Newsroom MVP

## Scope

Phase 9 task T062: role access, magic link controls, cron protection, webhook verification, no patient data persistence.

## Checklist and status

| Control | Status | Evidence |
|---|---|---|
| Role-based access (owner/manager/expert boundaries) | PASS | `services/api/src/routes/auth-middleware.ts` enforces bearer auth; owner-only reports check in `services/api/src/routes/reports.ts` |
| Magic link TTL + revocation | PASS | TTL + revoked checks in `services/api/src/routes/auth.ts` and `services/api/src/routes/docs.ts` |
| CRON_SECRET protection | PASS | `assertCronSecret()` in `services/api/src/routes/cron.ts`, requires `Authorization: Bearer ...` |
| Webhook signature/secret verification | PASS | `assertSecret()` in `services/api/src/routes/webhooks.ts` validates `x-webhook-secret` for POST webhooks |
| No patient data persistence | PASS (policy + schema check) | Domain entities and route payloads do not store patient identifiers/records; only editorial entities and metadata |

## Gaps and mitigations

- Current webhook protection is shared-secret header, not provider HMAC signature.

  For MVP this is acceptable, but before scale we should add provider-native signature verification per adapter.

- GET click links are intentionally token-based and do not require webhook secret.

  Risk is bounded by token entropy + TTL + stale-version checks.
