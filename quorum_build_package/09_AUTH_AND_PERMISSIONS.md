# 09 Authentication and Permissions — Quorum

## 1. Authentication strategy

| Actor | Mechanism | Notes |
|---|---|---|
| Dashboard user | OAuth with the Git host (GitHub/GitLab), or SAML/OIDC SSO when the org enforces it | Git identity is linked for permission intersection |
| Enterprise org | SAML 2.0 or OIDC + SCIM 2.0 provisioning | Plan-gated; enforcing SSO disables password-less fallbacks and personal invites |
| CLI | OAuth device-code flow → scoped token with mandatory expiry (max 365 days) | Token shown once |
| CI / service | Service API token (`qrm_pat_…`) with explicit scopes and expiry | Org-owned, audit-logged, rotatable |
| Git host → Quorum | HMAC-signed webhooks (`X-Hub-Signature-256`), constant-time verification, 5-minute freshness window | Replay-protected by delivery id |
| Quorum → Git host | GitHub App installation tokens minted per run, ~1h lifetime, never persisted | App private key in KMS |
| Quorum → model provider | Org-scoped credential from the secret store | Write-only in the UI |
| Internal service→service | mTLS inside the cluster + short-lived workload identity | No shared static secrets |

**Sessions:** HTTP-only, `Secure`, `SameSite=Lax` cookie holding an opaque session id (server-side
session record), 12h idle / 30d absolute, rotated on privilege change, revocable per device.
Refresh is server-side; no JWT is stored in `localStorage`. CSRF protection via double-submit token
on state-changing requests. CLI/API tokens are hashed (Argon2id) at rest and matched by prefix
index.

**Step-up re-authentication** is required for: deletion requests, provider-credential changes,
policy escalations (blocking, approve, auto-fix), SSO configuration, and API-token creation with
`admin` scope. Step-up issues a 5-minute `X-Reauth-Token`.

## 2. Roles

| Role | Intended holder |
|---|---|
| `owner` | Buyer/admin: billing, policy escalation, providers, deletion, SSO |
| `maintainer` | Tech lead: repo settings, rules, learnings, suppressions, posting held findings, approving auto-fix |
| `member` | Engineer: read runs and findings, dismiss with reason, re-run |
| `auditor` | Security/compliance: read-only everything including audit log, no mutations |
| `system` | Internal automations; appears in the audit log as `actor_type=system` |

Roles are org-level. **Repository visibility is always intersected with the caller's permissions on
the Git host**, refreshed at login and at most every 15 minutes: a `member` who cannot read
`acme/secret-repo` on GitHub cannot see its runs in Quorum, whatever their Quorum role says.

## 3. Permission matrix

| Capability | owner | maintainer | member | auditor |
|---|---|---|---|---|
| View runs / findings (permitted repos) | ✓ | ✓ | ✓ | ✓ |
| View evidence excerpts | ✓ | ✓ | ✓ | ✓ |
| View run trace with payloads | ✓ | ✓ | — | ✓ |
| Trigger a re-run | ✓ | ✓ | ✓ | — |
| Dismiss a finding with a reason | ✓ | ✓ | ✓ | — |
| Post a held finding to the PR | ✓ | ✓ | — | — |
| Create/modify suppressions | ✓ | ✓ | — | — |
| Create/edit/enable rules | ✓ | ✓ | — | — |
| Edit/delete learnings | ✓ | ✓ | — | — |
| Change repo state (observe/active) | ✓ | ✓ | — | — |
| Edit repo settings (lanes, budget) | ✓ | ✓ | — | — |
| Escalate policy (blocking, request-changes, approve, auto-fix) | ✓ (step-up) | — | — | — |
| Approve an auto-fix pause | ✓ | ✓ | — | — |
| Manage members and roles | ✓ | — | — | — |
| Configure SSO/SCIM | ✓ (step-up) | — | — | — |
| Configure model providers, tiers and credentials | ✓ (step-up) | — | — | — |
| Change the adaptive routing policy or promote a shadow policy | ✓ (step-up) | — | — | — |
| Billing, plan, credit cap | ✓ | — | — | — |
| Read audit log | ✓ | — | — | ✓ |
| Export org data | ✓ | — | — | ✓ (read-only export) |
| Request org deletion | ✓ (step-up) | — | — | — |
| Manage API tokens (org scope) | ✓ | — | — | — |
| Manage personal API tokens | ✓ | ✓ | ✓ | ✓ |

**API token scopes:** `runs:read`, `runs:write`, `findings:read`, `findings:write`,
`config:read`, `config:write`, `audit:read`, `admin`. A token can never exceed the granting
user's role, and is revoked automatically when that user's role is reduced or their membership ends.

## 4. Enforcement

- Every query goes through a repository layer that requires an `org_id` predicate; a lint rule and
  a test suite fail the build on any raw query without it. Postgres row-level security is enabled
  as a second line of defence.
- Authorisation is checked in a single decorator per endpoint (`@requires(Permission.X)`), and the
  matrix above is expressed as data so it is testable; a contract test asserts every route has an
  explicit permission binding (no default-allow).
- The Git-host permission intersection is cached for 15 minutes with immediate invalidation on
  `installation`/`member` webhooks.
- Deny-by-default on unknown roles, unknown scopes, and unmapped routes.

## 5. Bot identity and repository writes

Quorum writes to repositories only as its GitHub App, never using a human's token. App permissions
requested: `pull_requests: write` (comments, reviews), `checks: write`, `contents: read`
(`contents: write` only when auto-fix branches are enabled, requested as a separate optional
permission), `metadata: read`, and `members: read` for permission intersection. Each permission is
justified in the Marketplace listing and in the install screen (S01). Auto-fix and approval
capabilities are additionally gated by org policy, so an installation with write permission still
cannot write until an owner turns it on.

## 6. Self-hosted differences

Self-hosted deployments may run with a local identity provider or a static bootstrap owner; SSO is
included in the licence rather than plan-gated. The bootstrap owner credential must be rotated on
first login (enforced). Service-to-service mTLS is optional in single-node installs but the default
in the Helm chart.
