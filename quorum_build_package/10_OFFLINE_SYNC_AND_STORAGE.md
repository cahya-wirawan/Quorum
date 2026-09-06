# 10 Resilience, Caching, Offline and Storage — Quorum

Quorum is a server-side pipeline, so "offline" means four concrete things: (1) the dashboard when
the network or the Git host is unreachable, (2) the CLI without Quorum's cloud, (3) an air-gapped
self-hosted install, and (4) durable resumption when Quorum's own dependencies fail mid-run.

---

## 1. Degraded and offline behaviour by surface

| Surface | Condition | Behaviour |
|---|---|---|
| Dashboard | Browser offline | Service worker serves the app shell and the last-fetched lists; a banner states "Offline — showing data as of <time>"; all mutations disabled with an explanation, none queued silently except repo-state changes, which are queued explicitly and shown as "pending sync" |
| Dashboard | Git host unreachable | Runs already stored render normally; actions requiring the host (re-run, post held finding, approve) are disabled with the reason; queued runs continue to be accepted and will execute when the host returns |
| Dashboard | Quorum API unreachable | Read-only cached view, retry with backoff, explicit "reconnecting" state, no fabricated data |
| PR surfaces | Quorum unreachable | Nothing posts; the check run stays `in_progress` until the watchdog completes it as `neutral` with an explanatory message rather than leaving it hanging |
| CLI | No Quorum cloud, local model configured | Full local run: checkout is local, analyzers run locally, model calls go to the configured endpoint |
| CLI | No Quorum cloud, no model | Deterministic-only mode: analyzers + pattern rules, SARIF output, exit codes preserved |
| Self-hosted | Air-gapped | Full operation with a local model endpoint; licence via offline file; no telemetry |

## 2. Durable execution and resume

- Every run is a LangGraph thread with a Postgres checkpointer; default `durability="async"`,
  with `durability="sync"` for the publish and human-approval nodes (`04` §3).
- A worker that dies loses at most the node in flight. The queue lease expires, another worker
  claims the run and resumes from the last checkpoint; at most one node is re-executed (`NFR-04`).
- Non-idempotent effects live in exactly two nodes — `publish` (reconciles against existing
  comments by fingerprint before writing) and `fix` (writes only after an approval token that is
  consumed once). Everything else is pure with respect to external systems.
- Runs paused on `interrupt()` persist indefinitely up to 72 hours (auto-fix) or 90 days
  (checkpoint retention) and resume on `Command(resume=…)` from the API.
- Webhook payloads are persisted before acknowledgement and replayable for 7 days, so a total
  worker outage loses no reviews (`NFR-03`).

## 3. Caching

| Cache | Key | TTL | Invalidation |
|---|---|---|---|
| PR diff | `repo:pr:head_sha` | 24h | New head SHA |
| Provider response | `sha256(prompt|model|schema_version)` | 24h | Prompt version bump |
| Lane result | `diff_hash:lane:pipeline_version` | 7d | Pipeline or config change |
| Retrieval chunks | `repo:file:content_hash` | until file changes | Content hash |
| Embeddings | `content_hash` | indefinite | Content hash |
| Git-host permission intersection | `user:org` | 15 min | Membership/installation webhook |
| Effective config | `repo:config_version` | until version bump | Config write or `.quorum.yaml` change |
| Dashboard lists | `org:query` in the client | 60s stale-while-revalidate | Mutation or SSE event |

Cache hits are recorded on the run so a cheap re-run is visible in the cost breakdown rather than
looking like a suspiciously free review.

## 4. Index storage and lifecycle

- Symbol tables and edges in Postgres; embeddings in pgvector; large parse artefacts in object
  storage under `org/<org_id>/repo/<repo_id>/index/<commit>`.
- Incremental updates on default-branch push: only changed files are re-parsed and re-embedded.
- Staleness: an index older than the head by more than 500 commits or 7 days is marked `stale`,
  triggers a background rebuild, and runs continue in diff-scoped mode meanwhile.
- Storage guardrails: soft cap 5 GiB of index per repo (plan-dependent); above it, embeddings are
  restricted to changed-file neighbourhoods and the repo is flagged.
- Disabling a repo deletes its index within 24 hours; findings and history are kept.

## 5. Conflict resolution

| Conflict | Resolution |
|---|---|
| Two runs for the same PR (redelivery, manual + webhook) | Same `run_key` → attach to the existing run; different head SHA → the newer run supersedes and cancels the older at a node boundary (`FR-012`) |
| Comment anchor moved between analysis and publish | Re-resolve the anchor at publish time; if the line is gone, the finding is withdrawn from the review and listed in the summary as "no longer applicable" |
| Config changed mid-run | The run uses the config frozen at `ingest`; the new config applies to the next run, and the summary states which config version was used |
| Concurrent config edits (UI vs `.quorum.yaml`) | The file wins for keys it sets; the UI shows the override and its source; no silent merge |
| Concurrent dashboard edits (two maintainers) | Optimistic concurrency with `If-Match: <version>`; `409` returns the current version and a field-level diff |
| Offline queued repo-state change conflicts with a server change | Server wins; the queued change is surfaced as a rejected action with both values shown |
| Duplicate finding across lanes | Merged at `dedupe_merge`, strongest evidence retained, contributing lanes recorded |
| Feedback on a superseded run | Applied to the fingerprint, so it affects the current and future runs |

## 6. Client-side storage (dashboard)

`localStorage`: theme, saved views, last-used filters, collapsed sections — no findings, no code,
no tokens. IndexedDB via the service worker: a bounded (50 MB) read cache of recently viewed runs
and findings, cleared on logout and on org switch. Session identifiers live only in HTTP-only
cookies. All caches are cleared when an org deletion is scheduled.

## 7. Backup and recovery

- Postgres: continuous archiving, PITR with ≤5 min RPO, ≤1 h RTO; restores rehearsed quarterly and
  the rehearsal result recorded.
- Checkpoint database: same policy; a restore that rewinds checkpoints marks all `running` runs as
  `failed_needs_rerun` rather than resuming them from a stale state, because replaying a stale
  publish node could duplicate comments.
- Object storage: versioning + cross-region replication (cloud offering), lifecycle expiry matching
  retention.
- Backups are encrypted, access-logged, and pruned at 35 days; deletion requests are replayed
  against any restored backup before it serves traffic.
