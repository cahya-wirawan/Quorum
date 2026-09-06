# Quorum — Autonomous Code Review Pipeline

**Working title:** Quorum
**One line:** A multi-agent, evidence-gated pull-request reviewer built on LangGraph that only speaks when it can prove it.
**Research date:** 2026-09-06
**Package status:** build-ready blueprint (no application source code included)

## What this product is

Quorum connects to a Git host as an app, watches pull requests, and runs a durable
LangGraph state machine over each one. Deterministic analyzers run first (build, type
check, linters, SAST, test-impact). Specialised review lanes then reason over the diff
with retrieved repository context. Every candidate finding is routed to an adversarial
**verifier** that tries to refute it against the real code; only survivors are ranked,
budgeted, and posted to the pull request. Everything a finding claims is traceable back
to the graph run, the prompt version, the model, the tool calls, and the evidence.

The product exists because of one measured weakness in the category: reviewers are noisy.
Independent 2026 benchmarking of AI review agents reports precision as the discriminating
metric and a large share of comments landing as style noise rather than defects
(see `SOURCES.md`). Quorum's thesis is that **precision is the product**, and that an
explicit verify-then-publish graph plus a hard comment budget buys precision without
giving up recall inside the tool (unverified findings are retained, ranked, and browsable
in the dashboard — they are simply not posted to the PR).

## Chosen stack

| Layer | Choice |
|---|---|
| Orchestration | LangGraph (Python) — `StateGraph`, subgraphs, `Send` fan-out, `interrupt()`, Postgres checkpointer, `durability="async"` |
| Model routing | Provider-agnostic tiers with roles (`primary`/`escalation`/`fallback`/`floor`) and a deterministic adaptive router (P1) |
| Runtime | LangGraph Server standalone container (self-hostable) + FastAPI control/webhook plane |
| Workers / sandbox | Kubernetes Jobs, rootless + network-egress-denied containers, ephemeral repo checkouts |
| Datastores | PostgreSQL 16 (app + `pgvector`), separate Postgres database for LangGraph checkpoints, Redis 7 (queue, pub/sub, cache), S3-compatible object storage (artifacts, logs) |
| Retrieval | tree-sitter symbol index + SCIP/LSIF where available + hybrid BM25/vector search |
| Frontend | Next.js 15 (App Router) + TypeScript + Tailwind + shadcn-style component layer |
| CLI | Python (`quorum` console script), same graph, local execution |
| Models | Provider-abstracted; defaults Claude Opus 5 (verify/plan), Claude Sonnet 5 (lanes), Claude Haiku 4.5 (triage/classification) |
| Billing | Stripe — seats + review credits |
| Observability | OpenTelemetry, LangSmith (optional), Prometheus/Grafana, structured JSON logs |

## Package contents

| Document | Covers |
|---|---|
| `00_REFERENCE_ANALYSIS.md` | The reference category, evidence ledger, strengths/weaknesses/opportunities |
| `01_PRD.md` | Problem, personas, jobs to be done, MVP/P1/P2, `FR-001`+ requirements, NFRs, KPIs |
| `02_UX_SCREEN_SPEC.md` | Every screen and in-PR surface with states |
| `03_USER_FLOWS.md` | First run, review, dispute, auto-fix, billing, deletion, failure/recovery |
| `04_SYSTEM_ARCHITECTURE.md` | Services, LangGraph topology, sandbox, deployment, scaling, failure handling |
| `05_DATA_MODEL.md` | Entities, SQL DDL, indexes, retention, migrations |
| `06_API_SPEC.md` | REST + webhooks with request/response examples, errors, pagination, limits |
| `07_AI_OR_AUTOMATION_PIPELINE.md` | The LangGraph pipeline in full: nodes, state, reducers, evals, cost/latency |
| `08_SAFETY_PRIVACY_COMPLIANCE.md` | Data inventory, retention, processors, AI transparency, export/delete |
| `09_AUTH_AND_PERMISSIONS.md` | Auth strategy, roles, permission matrix, token handling |
| `10_OFFLINE_SYNC_AND_STORAGE.md` | Degraded modes, caches, resume/replay, CLI offline, air-gapped install |
| `11_MONETIZATION_AND_BILLING.md` | Plans, metering, purchase flow, entitlement source of truth |
| `12_ANALYTICS_AND_OBSERVABILITY.md` | Product events, operational metrics, dashboards, alerts, never-log list |
| `13_TEST_PLAN.md` | Unit → E2E, security, performance, AI evals, regression |
| `14_IMPLEMENTATION_ROADMAP.md` | Phases with deliverables, dependencies, exit criteria |
| `15_PRODUCT_BACKLOG.md` | Epics with actionable P0/P1/P2 tasks |
| `16_REPO_STRUCTURE.md` | Concrete monorepo tree and module boundaries |
| `17_DESIGN_SYSTEM.md` | Principles, tokens, components, motion, accessibility |
| `18_RELEASE_CHECKLIST.md` | Marketplace, privacy, billing, security, QA, ops, support |
| `19_PROMPT_LIBRARY.md` | Versioned prompts and JSON schemas for every LLM node |
| `20_ACCEPTANCE_CRITERIA.md` | Given/When/Then for critical behaviour |
| `21_RISKS_AND_OPEN_QUESTIONS.md` | Risks and unresolved decisions |
| `SOURCES.md` | Sources with access dates |
| `package_manifest.json` | Machine-readable package status |

## Major design decisions

1. **Verify-before-publish.** A finding is a hypothesis until a separate verifier agent,
   with a fresh context and mandatory code-fetch tools, fails to refute it.
2. **Evidence classes on every finding.** `reproduction`, `symbol_resolution`,
   `static_tool`, `test_failure`, `spec_violation`, `heuristic`. `heuristic`-only findings
   never post by default.
3. **Comment budget.** Hard per-PR cap (default 8 posted comments, configurable) with
   severity × calibrated-confidence ranking. Everything else lives in the dashboard.
4. **Durable graph, resumable runs.** Postgres checkpointer plus `durability="async"`; a
   worker crash resumes at the last completed node rather than re-reviewing the PR.
5. **Human-in-the-loop through `interrupt()`**, not out-of-band flags — approvals for
   auto-fix commits and for blocking check runs pause the graph and resume with `Command`.
6. **Repository code is never retained by default.** Checkouts live in an ephemeral
   sandbox and are destroyed at run end; only findings, evidence excerpts under a size
   cap, and metrics persist.
7. **Self-hostable from day one**, including bring-your-own model endpoint, because the
   buyers with the most PR volume are the ones least able to ship code to a vendor.
8. **Adaptive model routing** (P1): a pure, deterministic router picks the cheapest tier likely to
   answer each call, and escalates once on defined triggers. Route plans are cached and reused, so
   cost falls without runs becoming irreproducible — and `verify` never economises.

## How to start implementation

1. Read `01_PRD.md` (scope), then `04_SYSTEM_ARCHITECTURE.md` and
   `07_AI_OR_AUTOMATION_PIPELINE.md` (the two documents that constrain everything else).
2. Build Milestone M1 from `14_IMPLEMENTATION_ROADMAP.md`: GitHub App + webhook ingress +
   sandbox checkout + a single-lane graph that posts one summary comment.
3. Work the P0 list in `15_PRODUCT_BACKLOG.md` in order; each P0 names its acceptance
   criterion in `20_ACCEPTANCE_CRITERIA.md`.
4. Stand up the eval harness (`13_TEST_PLAN.md` §AI evals) before adding the second lane —
   precision claims are unfalsifiable without it.
