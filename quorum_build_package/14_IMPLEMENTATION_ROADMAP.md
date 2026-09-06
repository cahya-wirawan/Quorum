# 14 Implementation Roadmap — Quorum

Phases are dependency-ordered, not calendar-scheduled. Each phase names deliverables, dependencies,
and the exit criteria that must be demonstrably met before the next phase starts.

---

## M0 — Foundations

**Deliverables:** monorepo skeleton (`16_REPO_STRUCTURE.md`), CI (lint, type-check, test, build,
SBOM, container signing), local `docker compose` stack (Postgres ×2, Redis, MinIO, LangGraph
Server, GitHub API fake), Alembic baseline, structured logging + OTel wiring, secret management,
tenancy primitives (`org_id` scoping + RLS + the lint rule that enforces it).
**Dependencies:** none.
**Exit criteria:** a developer clones the repo and has the full stack running with one command;
CI is green; a smoke test proves cross-org isolation; a trivial LangGraph run persists a
checkpoint and resumes after a forced worker kill.

## M1 — Skeleton pipeline, one lane, one comment

**Deliverables:** GitHub App + webhook ingress (signature, dedupe, persist, ack <500ms); run
queue; sandbox runner with checkout and one analyzer; `ReviewState` and the graph through
`ingest → triage → deterministic → retrieval(diff-scoped) → lane:correctness → publish`;
summary comment + check run; minimal reviews inbox and review detail.
**Dependencies:** M0.
**Exit criteria:** a real PR on a test repo receives a summary comment and at least one accurate
inline comment within 3 minutes; a killed worker resumes without duplicating a comment; the run
appears in the inbox with a node timeline.

## M2 — Verification, evidence, budget (the differentiator)

**Deliverables:** verify subgraph with `Send` fan-out and enforced refutation contract; evidence
model and line-resolution enforcement; dedupe/merge; ranking, budget and suppression; held-finding
UI; feedback capture from PR resolutions and commands; `bench-clean` and `bench-injected` corpora
plus the eval harness in CI.
**Dependencies:** M1.
**Exit criteria:** on `bench-clean`, ≤1 posted finding per 20 clean PRs; posted precision ≥85% on
the internal set; every posted finding shows evidence with resolvable citations; the eval suite
blocks merges.

## M3 — Multi-lane, retrieval, transparency

**Deliverables:** symbol/embedding indexer and the full retrieval subgraph; lanes `security`,
`api_contract`, `tests`, `style` (advisory); lane isolation and degradation reporting; run trace
screen (S06) with payloads and redaction; provider abstraction with fallback and caching; large-PR
chunking with attention budget.
**Dependencies:** M2.
**Exit criteria:** four lanes run concurrently with per-lane failure isolation demonstrated by a
chaos test; index builds for a 100k-file repo; p50 time-to-first-comment ≤90s; trace answers
"why did it say that" for any posted comment in ≤2 clicks; posted precision ≥90%.

## M4 — Commercial and operational readiness (private beta)

**Deliverables:** auth (OAuth + sessions + step-up), roles and the permission matrix, org/member
management, repo settings and `.quorum.yaml`, policy engine and escalations, Stripe billing with
credits and caps, audit log, privacy export/delete, dashboards and alerts, status page, runbooks,
self-hosted `docker compose` + Helm chart, documentation site.
**Dependencies:** M3.
**Exit criteria:** an external team installs unaided and reaches an active repo; billing lifecycle
passes with Stripe test clocks; deletion completes end to end within the stated window;
authorisation matrix tests pass for every route × role; on-call rota and runbooks exist and a game
day has been run.

## M5 — General availability

**Deliverables:** accessibility remediation to WCAG 2.2 AA; performance and soak testing at target
scale; penetration test and remediation; Marketplace listing; pricing page; onboarding polish
(S03 guided first review); analytics screen (S10); notification channels; support workflows.
**Dependencies:** M4 + ≥10 beta orgs with ≥4 weeks of usage.
**Exit criteria:** acceptance rate ≥70% across beta orgs; mute rate <5%; zero open critical/high
security findings; all eval gates green for three consecutive releases; p95 review latency ≤5min;
cost per review ≤$0.35 median.

## M6 — P1 expansion

**Deliverables:** GitLab connector; auto-fix suggestions and approval-gated fix PRs; bot approval
(off by default); rules with specs (S08) and the learnings store (S09); calibration; performance,
data-migration and concurrency lanes; replay from checkpoint; Slack and outbound webhooks;
cross-provider verification; **adaptive model routing** (deterministic router, escalation layer,
route-plan cache, shadow-mode policy evaluation, routing report and S12 panel).
**Dependencies:** M5.
**Exit criteria:** GitLab reaches parity on the E2E suite; auto-fix PRs have zero unapproved
writes across 500 runs; rules cannot be enabled with failing specs; calibration ECE ≤0.08;
acceptance rate ≥80%; adaptive routing holds precision and recall within 1 point of the all-strong
baseline while cutting median cost ≥25%, with route-plan reuse ≥0.9 on re-runs.

## M7 — P2 scale-out

**Deliverables:** Azure DevOps and Bitbucket connectors; repository Q&A; test generation; IDE
extension; stacked-PR awareness; custom lane SDK (third-party subgraphs with capability limits);
air-gapped installer with bundled local models; SOC 2 Type II.
**Dependencies:** M6 and demonstrated demand per item — each is gated on evidence, not enthusiasm.
**Exit criteria:** per-item, defined at kickoff; the custom lane SDK additionally requires a
sandbox and capability model that prevents a third-party lane from posting, writing, or reading
outside its org.

---

## Cross-cutting sequencing rules

0. **Adaptive routing ships after the eval harness and after calibration, never before.** A cost
   optimisation without a measurement is a quality regression waiting to be discovered by a
   customer.
1. **The eval harness precedes the second lane.** Any lane added before measurement exists is a
   guess that cannot be defended.
2. **Verification precedes breadth.** More lanes without the verifier is exactly the failure mode
   the product exists to fix.
3. **Self-hosting is designed in at M0** (no managed-only dependencies), not retrofitted.
4. **Every phase ships its own observability**; a deliverable without metrics is not done.
5. **No phase may lower a previously met exit criterion** — the precision gate ratchets.
