# 15 Product Backlog — Quorum

Format: `ID · Priority · Estimate (S/M/L) · Depends on` — then a task statement written to be
directly actionable by a coding agent, with its done condition. `AC-xxx` refers to
`20_ACCEPTANCE_CRITERIA.md`; `FR-xxx` to `01_PRD.md`.

---

## Epic A — Platform foundations

| ID | P | Est | Dep | Task |
|---|---|---|---|---|
| A1 | P0 | M | — | Create the monorepo per `16_REPO_STRUCTURE.md` with `uv`-managed Python 3.12 services and a pnpm workspace for the web app. **Done:** `make dev` starts the whole stack; `make test` runs both suites. |
| A2 | P0 | M | A1 | `docker compose` dev stack: Postgres (app + checkpoints), Redis, MinIO, LangGraph Server, a GitHub API fake. **Done:** integration tests run against it in CI with no external network. |
| A3 | P0 | M | A1 | Alembic baseline implementing all DDL in `05_DATA_MODEL.md` §2–§3, monthly partitions on the six large tables. **Done:** migrate up/down clean on a 1M-row seeded database. |
| A4 | P0 | M | A3 | Tenancy layer: `org_id` on every query via a repository base class, Postgres RLS policies, and a lint rule + test that fails on any raw query without an org predicate. **Done:** cross-org fuzz test returns 404 for every randomized id. |
| A5 | P0 | S | A1 | Structured JSON logging with the redacting formatter, OTel tracing, and a CI check that fails on logging of request bodies or prompts. **Done:** a log-injection test proves secrets are masked. |
| A6 | P0 | S | A1 | Secret management: KMS/Vault client, envelope encryption for org credentials, rotation runbook. **Done:** credentials round-trip; the database never holds plaintext. |
| A7 | P0 | M | A1 | CI pipeline: lint, type-check, unit, integration, SBOM, container build + cosign signature, migration dry-run. **Done:** all gates enforced on PRs to `main`. |

## Epic B — Ingestion and run lifecycle

| ID | P | Est | Dep | Task |
|---|---|---|---|---|
| B1 | P0 | M | A3 | GitHub App registration + install flow (S01) with least-privilege scopes; persist `installation` and selected repos. **Done:** `AC-001`. |
| B2 | P0 | M | B1 | Webhook ingress: constant-time HMAC verification, 5-minute freshness, dedupe on delivery id, persist raw event, enqueue, ack <500ms. **Done:** `AC-010`; replayed and stale deliveries rejected. |
| B3 | P0 | M | B2 | Run creation with the `run_key` scheme, Redis Streams queue with consumer groups, per-PR lock, supersede-on-new-SHA. **Done:** `AC-011`, `AC-012`. |
| B4 | P0 | S | B3 | Dead-letter stream after 3 attempts + replay endpoint and S16 control. **Done:** a poison event lands in DLQ and replays successfully after a fix. |
| B5 | P0 | M | B3 | Sandbox runner: K8s Job spec, rootless, read-only rootfs, deny-all egress, ephemeral volume, TTL cleanup, orphan sweeper. **Done:** the egress-denial test fails to connect; volumes are gone after completion. |
| B6 | P0 | M | B5 | Analyzer harness: pluggable analyzer registry, SARIF normalisation, per-analyzer timeout and degradation, CI-signal collection. **Done:** `AC-020`; a failing analyzer never aborts a run. |
| B7 | P1 | S | B3 | Watchdog: cancel runs stuck >30min, publish partial results, complete the check run rather than leaving it hanging. **Done:** chaos test asserts no orphaned `in_progress` checks. |

## Epic C — The graph

| ID | P | Est | Dep | Task |
|---|---|---|---|---|
| C1 | P0 | M | A2 | Define `ReviewState` with reducers (`merge_findings`, `merge_dicts`, `add_cost`) and property tests for concurrent writes. **Done:** concurrent `Send` results never lose a finding. |
| C2 | P0 | M | C1 | Compile the `StateGraph` with `AsyncPostgresSaver` + `Store`; wire `durability="async"` with `sync` for publish/approval. **Done:** kill-at-each-node test resumes with ≤1 node re-executed (`AC-040`). |
| C3 | P0 | M | C2 | `ingest` node: freeze config/policy versions, fetch PR + diff, sanitise PR text, post in-progress summary and check run within 10s. **Done:** `AC-013`. |
| C4 | P0 | M | C3 | `triage` node with deterministic overrides for lockfile/generated/vendored diffs and security-sensitive paths. **Done:** `AC-014`. |
| C5 | P0 | L | C3 | `deterministic` node driving the sandbox and attaching `AnalyzerResult[]`. **Done:** `AC-020`. |
| C6 | P0 | L | C5 | Retrieval subgraph (diff-scoped first; index-backed in C12) recording path/line/score for every chunk. **Done:** evidence panel can render exactly what the model saw. |
| C7 | P0 | L | C6 | Lane subgraph factory (`focus → reason → self_check → emit`) + the `correctness` lane with its schema and severity ceiling. **Done:** `AC-022`. |
| C8 | P0 | M | C7 | Lane fan-out via `Send`, per-lane isolation, degradation recorded in state and disclosed in the summary. **Done:** `AC-023`. |
| C9 | P0 | M | C8 | `dedupe_merge` with fingerprinting and heuristic-only demotion. **Done:** duplicate findings across lanes merge with unioned evidence. |
| C10 | P0 | L | C9 | Verify subgraph: `Send` per finding, read-only tools, enforced `refutation_attempt`, tool-call requirement, head-SHA line resolution, different model tier. **Done:** `AC-030`, `AC-031`. |
| C11 | P0 | M | C10 | `calibrate_rank_budget` + `policy` + `publish` with reconciliation and one-review-per-run posting. **Done:** `AC-032`, `AC-042`, `AC-047`. |
| C12 | P0 | L | C6 | Indexer: tree-sitter symbol extraction, edges, chunk embeddings in pgvector, incremental update on default-branch push, stale detection. **Done:** 100k-file repo indexes and incrementally updates in <2min. |
| C13 | P0 | M | C7 | Lanes `security`, `api_contract`, `tests` with their prompts and schemas. **Done:** each has ≥20 eval cases passing. |
| C14 | P1 | M | C11 | `fix` subgraph + `approval` node using `interrupt()`; resume through `POST /v1/runs/{id}/resume`. **Done:** `AC-045`. |
| C15 | P1 | M | C11 | Calibration job (Platt scaling per org/repo/lane/category) fed by feedback labels. **Done:** ECE ≤0.08 on held-out data. |
| C16 | P1 | M | C13 | Lanes `performance`, `data_migration`, `concurrency`. **Done:** eval gates hold with the added lanes. |
| C17 | P2 | L | C8 | Custom lane SDK: third-party subgraph contract with capability limits and org sandboxing. |

## Epic D — Model layer

| ID | P | Est | Dep | Task |
|---|---|---|---|---|
| D1 | P0 | M | A6 | `ModelProvider` protocol + Anthropic implementation with structured output, schema-repair retry, transport retries, timeouts. **Done:** invalid JSON is repaired once then degrades. |
| D2 | P0 | S | D1 | Prompt registry: versioned prompt templates loaded from files, `prompt_id`/`prompt_version` recorded per node. **Done:** changing a prompt without bumping its version fails CI. |
| D3 | P0 | M | D1 | Per-node-class provider resolution, org overrides, OpenAI-compatible endpoint support, connection test endpoint. **Done:** `AC-081`. |
| D4 | P0 | S | D1 | Response cache keyed on prompt hash with per-org namespace and cost accounting of hits. **Done:** cache hits appear in the run cost breakdown. |
| D5 | P0 | M | D1 | Cost/token accounting per node, per-run ceilings, and the partial-publish path on breach. **Done:** `AC-070`. |
| D6 | P0 | M | D1 | Prompt-injection defences: sanitiser, delimited untrusted blocks, injection classifier, quarantine path. **Done:** the adversarial suite shows zero instruction-following. |
| D7 | P1 | M | D3 | Deterministic pre-call router: `route(node_class, signals, policy) -> ModelChoice` over hunk risk, lane, path sensitivity, diff complexity, historical lane yield, remaining budget, latency headroom and provider health; tiers and roles on `provider_config`; floors enforced. **Done:** `AC-084` first and fourth clauses; property test proves purity across processes. |
| D8 | P1 | M | D7 | Escalation layer: the six triggers, one escalation per call, per-run budget, escalated result replaces the routed one with both retained in the trace, `run_node` routing columns populated. **Done:** `AC-084` second and third clauses. |
| D9 | P1 | S | D8 | Route-plan cache keyed on `(diff_hash, lane, pipeline_version, config_version)`, reused on re-run and on replay. **Done:** `AC-085` first clause; `quorum_route_plan_reuse_ratio` ≥0.9. |
| D10 | P1 | M | D8 | Shadow mode: log the tier a candidate policy would choose while the current policy executes; harness replays both across all three corpora; promotion gate and 5% canary. **Done:** a policy cannot be promoted below the precision/cost gate. |
| D11 | P1 | S | D8 | Routing report: tier share, escalation rate, escalation yield, realised savings; API endpoint plus the S12 panel. **Done:** `AC-085` second clause. |

## Epic E — Product surfaces (web)

| ID | P | Est | Dep | Task |
|---|---|---|---|---|
| E1 | P0 | M | A1 | Next.js app shell, design tokens from `17_DESIGN_SYSTEM.md`, auth-guarded routing, theme, error boundaries. |
| E2 | P0 | M | B1 | S01 Connect + S02 repo selection with index progress. **Done:** `AC-001`, `AC-002`. |
| E3 | P0 | L | C11 | S04 reviews inbox (virtualised, filterable, URL-serialised, live via SSE). **Done:** 10k rows scroll at 60fps; filters restore from URL. |
| E4 | P0 | L | C11 | S05 review detail: finding groups, diff viewer, evidence panel, dismiss with reason, post-held action. **Done:** `AC-050`, `AC-051`. |
| E5 | P0 | M | C2 | S06 run trace with live streaming, redaction, payload download. **Done:** `AC-052`. |
| E6 | P0 | M | C11 | S07 repo settings with effective-config viewer showing per-key source. **Done:** `AC-005`. |
| E7 | P0 | M | F1 | S11 org/members, S17 account, S14 audit log. |
| E8 | P0 | M | G1 | S13 billing, S15 data & privacy. |
| E9 | P0 | M | E2 | S03 guided first review with the would-have-posted comparison. **Done:** `AC-004`. |
| E10 | P1 | M | C15 | S10 analytics with acceptance-rate tracking and data-table toggles for every chart. |
| E11 | P1 | M | C16 | S08 rules editor with spec cases and backtest. **Done:** `AC-025`. |
| E12 | P1 | M | C15 | S09 learnings management. **Done:** `AC-061`. |
| E14 | P1 | M | D11 | S12 routing panel: mode selector, trigger toggles, budget, maximum tier, live report, shadow promotion dialog showing precision and cost deltas. **Done:** promotion is blocked under 50 observed runs. |
| E13 | P0 | S | — | S16 system health for self-hosted operators. |

## Epic F — Auth, roles, governance

| ID | P | Est | Dep | Task |
|---|---|---|---|---|
| F1 | P0 | M | A4 | OAuth login, server-side sessions, CSRF, step-up re-auth, device-code flow for the CLI. |
| F2 | P0 | M | F1 | Roles + permission matrix as data, a single `@requires` decorator, and a contract test asserting every route has an explicit binding. **Done:** `AC-090`. |
| F3 | P0 | M | F1 | Git-host permission intersection with 15-minute cache and webhook invalidation. **Done:** a user without host access cannot see the repo's runs. |
| F4 | P0 | S | F2 | Audit logging middleware for every privileged action + NDJSON export. |
| F5 | P1 | M | F1 | SAML/OIDC SSO + SCIM provisioning. |
| F6 | P0 | M | F2 | Personal and service API tokens with scopes, expiry, Argon2id hashing, prefix lookup, auto-revocation on role change. |

## Epic G — Commerce

| ID | P | Est | Dep | Task |
|---|---|---|---|---|
| G1 | P0 | M | A3 | Stripe integration: checkout, portal, subscription webhooks, entitlements mirrored from Stripe. **Done:** `AC-071`. |
| G2 | P0 | M | G1 | Credit metering from `usage_record`, hourly idempotent reporting, nightly reconciliation with drift alert. |
| G3 | P0 | M | G1 | Caps and degradation: 80%/100% notifications, `degrade`/`notify_only` policies, observe-mode summary comment explaining the degradation. **Done:** `AC-070`. |
| G4 | P0 | S | G1 | Active-seat computation job with proration semantics. |
| G5 | P1 | S | G2 | Pre-run cost estimate surfaced in S07/S13. |

## Epic H — Privacy, compliance, self-hosting

| ID | P | Est | Dep | Task |
|---|---|---|---|---|
| H1 | P0 | M | A3 | Retention jobs: partition drops, object lifecycle rules, checkpoint purge, overdue-deletion alerting. |
| H2 | P0 | M | H1 | Export job producing NDJSON + manifest with a 72h signed URL. **Done:** `AC-083`. |
| H3 | P0 | M | H1 | Deletion flow: step-up auth, 24h window, full purge, installation revocation, certificate email. **Done:** `AC-083`. |
| H4 | P0 | S | A6 | Excerpt cap + secret redaction before any persistence or model call. **Done:** `AC-082`. |
| H5 | P0 | L | A2 | Self-hosted artefacts: Helm chart, `docker compose` reference, offline licence, install docs, upgrade/migration guide. **Done:** `AC-080`. |
| H6 | P1 | M | H5 | Air-gapped mode with a local model endpoint and deterministic-only fallback. |

## Epic I — Quality system

| ID | P | Est | Dep | Task |
|---|---|---|---|---|
| I1 | P0 | L | C7 | Build `bench-clean`, `bench-injected`, `bench-historical` corpora with a versioned labelling guide. |
| I2 | P0 | M | I1 | Eval harness runner producing a per-`pipeline_version` report; wire as a blocking CI gate. **Done:** `AC-100`. |
| I3 | P0 | M | I2 | Adversarial prompt-injection corpus and gate. **Done:** `AC-101`. |
| I4 | P0 | S | I2 | Golden-set diff review step in the release process. |
| I5 | P0 | M | C11 | Feedback ingestion from PR resolutions, reactions, and commands into `feedback`. **Done:** `AC-060`. |
| I6 | P1 | M | I5 | Auto-disable rules exceeding a 30% dismissal rate over 20 firings, with author notification. |
| I7 | P0 | M | E3 | Quality dashboard (acceptance, false-positive, refute rate, per-lane yield) with release comparison. |

## Epic J — CLI and integrations

| ID | P | Est | Dep | Task |
|---|---|---|---|---|
| J1 | P0 | M | C11 | `quorum review` with `--pr/--diff/--range`, text/json/SARIF output, documented exit codes. **Done:** `AC-094`. |
| J2 | P0 | S | J1 | `quorum login` (device code), `quorum config`, `quorum trace`. |
| J3 | P1 | M | C11 | GitLab connector behind the same host-abstraction interface. |
| J4 | P1 | S | C11 | Slack notifications and outbound webhooks with HMAC signatures and retries. |
| J5 | P2 | L | J3 | Azure DevOps and Bitbucket connectors. |

---

## P0 ordering for the first executable slice

`A1 → A2 → A3 → A4 → A7 → B1 → B2 → B3 → B5 → C1 → C2 → C3 → C4 → C5 → D1 → D2 → C6 → C7 → C8 → C9 → C10 → C11 → E1 → E3 → E4 → I1 → I2`

That sequence ends at the product's actual claim: a PR receives a small number of verified,
evidence-backed comments, and a blocking eval gate proves the claim on every subsequent change.
