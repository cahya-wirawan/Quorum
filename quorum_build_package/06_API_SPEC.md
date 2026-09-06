# 06 API Specification — Quorum

Base URL: `https://api.quorum.dev` (self-hosted: `https://<host>/api`).
All endpoints are versioned by path: `/v1`. OpenAPI 3.1 is generated from FastAPI and published
at `/v1/openapi.json`.

---

## 1. Conventions

- **Auth:** `Authorization: Bearer <token>` where the token is a session JWT (dashboard) or a
  personal/service API token (`qrm_pat_…`). Every request resolves to exactly one `org_id`;
  cross-org access is impossible by construction, not by check.
- **Content type:** `application/json; charset=utf-8`. Times are RFC 3339 UTC.
- **Versioning:** additive changes ship in `/v1`. Breaking changes ship as `/v2` with 12 months
  of overlap. A `Quorum-Api-Version` response header records the served build.
- **Idempotency:** all POST endpoints that create work accept `Idempotency-Key`; a repeated key
  within 24h returns the original response with `Idempotent-Replay: true`.
- **Pagination:** cursor-based. `?limit=50&cursor=<opaque>`; responses carry
  `{"data": [...], "next_cursor": "...", "has_more": true}`. `limit` max 200.
- **Filtering/sorting:** documented per endpoint; unknown query parameters are a 400, never
  silently ignored.
- **Rate limits:** 600 req/min per token for reads, 60 req/min for writes, 10 run-creations/min
  per repo. Headers: `RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset`. 429 includes
  `Retry-After`.
- **Errors:** RFC 9457 problem details.

```json
{
  "type": "https://docs.quorum.dev/errors/policy-forbids-approval",
  "title": "Policy forbids approval",
  "status": 409,
  "detail": "Repository policy v7 sets may_approve=false.",
  "instance": "/v1/runs/019299b6-2f7e-7a11-9f2c-1f0a0a0d0001/approve",
  "request_id": "req_01JQ3Z8V6N",
  "errors": [{"field": "event", "code": "not_permitted"}]
}
```

Error codes: `400 invalid_request`, `401 unauthenticated`, `403 forbidden`,
`404 not_found`, `409 conflict`, `422 validation_failed`, `423 org_deletion_scheduled`,
`429 rate_limited`, `499 client_closed`, `500 internal`, `503 dependency_unavailable`.

---

## 2. Runs

### `POST /v1/runs` — request a review

```http
POST /v1/runs
Idempotency-Key: 5f1c1e4a-3c2b-4a0e-9c1b-8a4d0f2e77aa

{
  "repo_id": "0192996f-6a41-7c1e-8b74-9c9a0a3c1001",
  "pull_request_number": 412,
  "mode": "full",
  "reason": "manual_rerun",
  "overrides": { "comment_budget": 12, "lanes": ["correctness", "security"] }
}
```

```json
201 Created
{
  "id": "019299b6-2f7e-7a11-9f2c-1f0a0a0d0001",
  "state": "queued",
  "run_key": "0192996f…:412:9f3ac21…:14:2026.09.1",
  "thread_id": "0192996f…:412:9f3ac21…:14:2026.09.1",
  "mode": "full",
  "estimated_credits": 3.2,
  "created_at": "2026-09-06T10:22:14Z",
  "links": { "self": "/v1/runs/019299b6…", "events": "/v1/runs/019299b6…/events" }
}
```

`409 conflict` when an identical `run_key` is already active, with
`"existing_run_id"` in `errors[0].meta` so the caller can attach instead.

### `GET /v1/runs` — list

Query: `repo_id`, `state`, `verdict`, `since`, `until`, `min_severity`, `author`, `limit`, `cursor`,
`sort=created_at|duration|credits`.

```json
200 OK
{
  "data": [{
    "id": "019299b6-2f7e-7a11-9f2c-1f0a0a0d0001",
    "repo": { "id": "0192996f…", "full_name": "acme/payments" },
    "pull_request": { "number": 412, "title": "Add idempotent refund path", "author": "dev-maya" },
    "state": "completed",
    "mode": "full",
    "verdict": "attention",
    "counts": { "posted": 2, "held": 6, "suppressed": 3, "refuted": 5 },
    "lanes_run": ["correctness","security","api_contract","tests"],
    "lanes_degraded": [],
    "routing": { "mode": "adaptive", "escalations": 1, "tier_share": {"1": 2, "2": 5, "3": 6},
                 "savings_usd": 0.11 },
    "duration_ms": 74210,
    "first_comment_ms": 61100,
    "credits": 3.1,
    "created_at": "2026-09-06T10:22:14Z"
  }],
  "next_cursor": "eyJjIjoiMjAyNi0wOS0wNlQxMDoyMjoxNFoifQ",
  "has_more": true
}
```

### `GET /v1/runs/{run_id}` — detail
Returns the run plus `findings` (summarised), `analyzers`, `policy_version`, `config_version`,
`pipeline_version`, and cost breakdown.

### `GET /v1/runs/{run_id}/events` — live stream (SSE)
`text/event-stream`, events `node.started`, `node.finished`, `finding.candidate`,
`finding.verified`, `run.state`, `run.finished`, each with `run_id` and a monotonic `seq`.
Reconnect with `Last-Event-ID`; the server replays from the last 500 events.

```
event: node.finished
id: 42
data: {"run_id":"019299b6…","node":"lane:security","status":"ok","duration_ms":18420,"tokens_out":1204}
```

### `POST /v1/runs/{run_id}/cancel`
`202` with `{"state":"canceling"}`. Cancellation takes effect at the next node boundary; already
posted comments are not removed.

### `POST /v1/runs/{run_id}/resume` — answer a human-in-the-loop interrupt

```http
POST /v1/runs/019299b6…/resume
{ "decision": "approve", "target": "autofix", "note": "Patch looks right", "finding_ids": ["0192a1…"] }
```
```json
200 OK
{ "state": "running", "resumed_at": "2026-09-06T10:31:02Z" }
```
`409` if the run is not `awaiting_human`; `403` if the caller lacks `maintainer`.

### `GET /v1/runs/{run_id}/trace`
Each node in the trace carries `routed_tier`, `route_reason`, `escalated_from` and
`escalation_trigger`, so a posted comment can be attributed to the model that actually produced it.
Node-by-node trace. `?include=payloads` requires `maintainer` and returns signed object-storage
URLs valid 15 minutes. Payloads are redacted server-side and truncated above 256 KB.

### `POST /v1/runs/{run_id}/replay` (P1)
`{"from_checkpoint": "…", "config_overrides": {...}, "dry_run": true}` — `dry_run` is enforced
server-side; replays can never publish.

---

## 3. Findings

### `GET /v1/findings`
Query: `run_id`, `repo_id`, `status`, `severity`, `lane`, `category`, `fingerprint`, `since`.

```json
{
  "data": [{
    "id": "0192a1c3-7b90-7f2e-a4d1-2b3c4d5e6f70",
    "run_id": "019299b6…",
    "lane": "correctness",
    "category": "logic_error",
    "severity": "high",
    "title": "Refund retry drops the idempotency key",
    "claim": "On retry, refund_payment() regenerates idempotency_key, so a duplicate refund can be issued.",
    "file_path": "payments/refund.py",
    "start_line": 118, "end_line": 126,
    "status": "posted",
    "evidence_classes": ["symbol_resolution","test_failure"],
    "raw_confidence": 0.84,
    "calibrated_confidence": 0.79,
    "rank_score": 6.31,
    "verification": {
      "verdict": "confirmed",
      "refutation_attempt": "Checked whether the caller passes a stable key: retry_wrapper() at retries.py:44 calls with no key argument, so the default factory runs on every attempt.",
      "confidence": 0.81
    },
    "posted_comment": { "provider_comment_id": "2384991201", "state": "posted" }
  }],
  "next_cursor": null, "has_more": false
}
```

### `GET /v1/findings/{id}` — includes full `evidence[]` with excerpts (subject to org policy).

### `POST /v1/findings/{id}/feedback`
```json
{ "signal": "wrong", "note": "retry_wrapper passes the key since #388", "source": "dashboard" }
```
`201` returns the feedback record and `{"suppression_created": true, "learning_proposed": true}`.

### `POST /v1/findings/{id}/post` — publish a held finding
`403` if policy forbids, `409` if the anchor line no longer exists at head with
`"reason": "anchor_lost"`.

### `POST /v1/findings/{id}/suppress`
`{"kind":"fingerprint","scope":"repo","expires_at":null}`.

---

## 4. Repositories, config, policy

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/v1/repos` | List repos with state, index status, retrieval mode |
| `PATCH` | `/v1/repos/{id}` | `{"state":"active"}` — changing to `active` requires `maintainer` |
| `POST` | `/v1/repos/{id}/index` | Rebuild the index; `202` with an index job id |
| `GET` | `/v1/repos/{id}/config` | Effective merged config with per-key `source` |
| `PUT` | `/v1/repos/{id}/config` | UI-layer config; `422` returns per-key validation errors |
| `POST` | `/v1/repos/{id}/config/validate` | Validate a `.quorum.yaml` body without saving |
| `GET`/`POST` | `/v1/policies` | Read/create a policy version (creates, never mutates) |

```json
GET /v1/repos/0192996f…/config  →  200
{
  "version": 14,
  "effective": {
    "comment_budget": { "value": 8, "source": "org" },
    "min_post_severity": { "value": "medium", "source": "file" },
    "lanes": { "value": ["correctness","security","api_contract","tests"], "source": "default" },
    "path_exclude": { "value": ["vendor/**","**/*.generated.ts"], "source": "file" }
  },
  "file": { "present": true, "path": ".quorum.yaml", "valid": true, "sha": "b21f…" }
}
```

---

## 5. Rules, learnings, suppressions

| Method | Path | Notes |
|---|---|---|
| `GET`/`POST` | `/v1/rules` | Create a rule in `draft`; it cannot be enabled until its spec passes |
| `POST` | `/v1/rules/{id}/test` | Runs spec cases and a backtest over recent PRs; `202` + job |
| `PATCH` | `/v1/rules/{id}` | `{"status":"enabled"}` → `409 spec_failing` if cases fail |
| `GET`/`PATCH`/`DELETE` | `/v1/learnings/{id}` | Escalated confirmation required to suppress `high`+ security |
| `GET`/`DELETE` | `/v1/suppressions/{id}` | |

---

## 6. Org, members, billing, privacy

| Method | Path | Notes |
|---|---|---|
| `GET`/`PATCH` | `/v1/org` | Retention, overage policy, excerpt persistence |
| `GET`/`POST`/`DELETE` | `/v1/org/members` | Role changes audit-logged; last owner protected (`409 last_owner`) |
| `GET` | `/v1/org/usage?period=2026-09` | Credits, cost, projection, cap |
| `POST` | `/v1/billing/checkout-session` | Returns a Stripe Checkout URL |
| `POST` | `/v1/billing/portal-session` | Stripe customer portal |
| `GET`/`PUT` | `/v1/providers` | Model provider config per node class, including `tier` and `role` (`primary`/`escalation`/`fallback`/`floor`); credentials write-only |
| `GET`/`PUT` | `/v1/providers/routing` | Routing policy: `mode` (`static`/`adaptive`/`shadow`), escalation triggers, per-run escalation budget, maximum tier. Writing it bumps the effective `config_version` for every affected repo |
| `GET` | `/v1/providers/routing/report?period=2026-09` | Tier share, escalation rate, escalation yield, realised savings versus an all-strong baseline |
| `POST` | `/v1/providers/test` | Live connectivity test; returns latency and redacted response |
| `GET` | `/v1/audit?since=…` | NDJSON when `Accept: application/x-ndjson` |
| `POST` | `/v1/privacy/export` | `202` + job; signed URL emailed on completion |
| `POST` | `/v1/privacy/delete` | Requires step-up auth header `X-Reauth-Token`; 24h cancellation window |
| `DELETE` | `/v1/privacy/delete` | Cancels a scheduled deletion |

---

## 7. Inbound webhooks (Quorum receives)

`POST /v1/hooks/github` — verifies `X-Hub-Signature-256` (HMAC-SHA256, constant-time compare),
rejects deliveries older than 5 minutes, dedupes on `X-GitHub-Delivery`, persists, returns
`202 Accepted` in under 500ms. Unknown event types are stored and ignored.
`POST /v1/hooks/stripe` — verifies `Stripe-Signature`; entitlement changes are applied from
Stripe, which is the source of truth.
`POST /v1/hooks/gitlab` (P1) — verifies `X-Gitlab-Token`.

## 8. Outbound webhooks (Quorum sends, P1)

Subscribe per org: `run.completed`, `run.failed`, `finding.posted{severity>=high}`,
`budget.threshold`, `autofix.awaiting_approval`.

```http
POST https://customer.example/hooks/quorum
Quorum-Event: run.completed
Quorum-Delivery: 019299c0-1a2b-7c3d-8e4f-5a6b7c8d9e0f
Quorum-Signature: t=1757152934,v1=6f2a…

{"event":"run.completed","run_id":"019299b6…","repo":"acme/payments","pr":412,
 "verdict":"attention","counts":{"posted":2,"held":6},"credits":3.1}
```

Signature: `HMAC-SHA256(secret, "{t}.{body}")`. Retries: 5 attempts over 6 hours with exponential
backoff; consumers must be idempotent on `Quorum-Delivery`.

---

## 9. Git-host API usage (Quorum calls out)

| Purpose | Endpoint |
|---|---|
| Fetch PR + diff | `GET /repos/{o}/{r}/pulls/{n}` (`.diff` media type), `GET /repos/{o}/{r}/compare/{base}...{head}` |
| Post the review | `POST /repos/{o}/{r}/pulls/{n}/reviews` with `event: COMMENT` and a `comments[]` array using `path`, `line`, `side`, `start_line` |
| Update the summary | `PATCH /repos/{o}/{r}/issues/comments/{id}` |
| Check run | `POST`/`PATCH /repos/{o}/{r}/check-runs` |
| Approve (P1, policy-gated) | `POST …/pulls/{n}/reviews` with `event: APPROVE` |
| Existing CI signals | `GET /repos/{o}/{r}/commits/{sha}/check-runs` |

Rules: one review per run (never *N* separate comment calls — it protects the author's inbox and
the secondary rate limit); every write carries a retry budget honouring `Retry-After`; posts are
serialised per repository through a Redis lock; a 403 with `secondary rate limit` backs off for
at least 60s and re-queues rather than failing the run.
