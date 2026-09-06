# 01 PRD — Quorum

**Product:** Quorum — Autonomous Code Review Pipeline
**Document status:** complete for MVP + P1 planning
**Date:** 2026-09-06

---

## 1. Vision and problem

Automated PR review is now table stakes, and it is broadly distrusted. The category's own
benchmarks and reviews put false positives at the top of every complaint list, and report
that most posted comments are style noise rather than defects (`SOURCES.md` S20–S23). The
failure mode is predictable: a reviewer that is wrong 30% of the time trains engineers to
skim, then to mute, then to uninstall.

**Quorum's thesis:** an automated reviewer should behave like a good senior engineer who is
short on time — say few things, be able to prove each one, and stay quiet otherwise.

Quorum implements that as an explicit pipeline rather than a prompt: deterministic analysis
first, specialised review lanes second, an adversarial verifier third, and a policy-governed
publisher last. The pipeline is a LangGraph state machine, so it is durable, resumable,
inspectable, and replayable — the run that produced a comment can be re-opened and read.

## 2. Personas

### P1 — Maya, senior engineer / de facto reviewer (primary)
Reviews 15–30 PRs a week on top of her own work. Wants the bot to catch the cross-file
mistakes she misses at 5pm and to shut up about import ordering. Judges the tool in the
first three comments she reads. **Job to be done:** *When a teammate opens a PR, help me find the
things that will break production, so I can approve quickly without carrying the risk.*

### P2 — Dev, mid-level author (primary)
Wants a fast, specific first pass before a human looks, so review rounds shrink.
**Job to be done:** *When I push, tell me what a reviewer would flag — with a patch I can apply —
before I ask a human for time.*

### P3 — Priya, platform / DevEx lead (buyer)
Owns the tooling budget and the "does this actually help" question. Needs measurable
acceptance rates, predictable cost, and the ability to set org policy.
**Job to be done:** *When I roll out a review bot, prove it improves cycle time without adding noise,
and let me control what it may block.*

### P4 — Sam, security / compliance engineer (blocker-turned-champion)
Cares where source code goes, what is retained, and whether AI output is auditable.
**Job to be done:** *When engineering adopts an AI reviewer, confirm no code is retained, all actions
are logged, and I can run it inside our boundary.*

### P5 — Ana, OSS maintainer (growth wedge)
Triaging drive-by contributor PRs alone. **Job to be done:** *When a stranger opens a PR, tell me
whether it is worth my attention and what is wrong with it.*

## 3. Value proposition

> Quorum posts fewer review comments than any competitor — and every one of them survived an
> agent that was trying to prove it wrong.

**Differentiators**
1. Adversarial verification before publication (not post-hoc confidence scores).
2. Evidence classes: a finding names *how* it is known, and heuristic-only findings do not post.
3. Hard, configurable comment budget with calibrated ranking.
4. Replayable graph trace per run, per finding, per prompt version, per model.
5. Rules with test cases; a convention is only enforced when its rule spec passes.
6. Self-hostable, bring-your-own-model, no source retention by default.
7. Predictable cost with a per-PR estimate and hard caps.

## 4. Goals and non-goals

### Goals
- G1 Reach ≥90% posted-comment precision (share of posted comments a repo owner marks useful) on the internal eval corpus before general availability.
- G2 Keep p50 time-to-first-comment ≤90s and p95 ≤5min for PRs under 1,000 changed lines.
- G3 Make every posted comment traceable to evidence in ≤2 clicks.
- G4 Make cost per review predictable and visible before it is incurred.
- G5 Ship a self-hostable artefact from the first GA release.

### Non-goals (MVP)
- N1 Not an IDE extension or an autonomous coding agent that implements features.
- N2 Not a general repository chat/Q&A product (P2 at the earliest).
- N3 Not a replacement for CI; Quorum consumes CI signals, it does not own the build.
- N4 Not a SAST vendor; it orchestrates existing scanners rather than writing new engines.
- N5 No test *generation* in MVP (test-gap detection only).
- N6 No support for Perforce/SVN or non-Git VCS, ever.
- N7 Not a code-quality scorecard or developer-productivity surveillance product; per-author "quality scores" are explicitly out of scope.

## 5. Scope

### MVP (Milestones M1–M4)
GitHub App only. Automatic review on PR open/synchronize. Deterministic analyzer stage.
Four lanes (correctness, security, api-contract, tests). Adversarial verify. Comment budget.
Summary comment + inline comments + check run. Dashboard: reviews list, review detail with
trace, repo settings, org/members, billing. Resolution-reason capture. CLI dry-run.
Self-hosted container. Stripe billing.

### P1
GitLab support. Auto-fix suggestions with human-in-the-loop approval. Bot approval of
low-risk PRs (off by default). Rule specs. Learnings store UI. Adaptive model
routing with shadow-mode policy evaluation. Performance and
migration/data-safety lanes. Analytics with precision tracking. Slack notifications.
Azure DevOps and Bitbucket connectors.

### P2
Repository Q&A. Test generation. IDE extension. Multi-PR/stacked-PR awareness. Custom lane
SDK (teams write their own lane as a LangGraph subgraph). Issue-tracker linkage.
On-prem air-gapped installer with bundled local models.

## 6. Functional requirements

Priority is P0 (MVP), P1, P2. Every requirement's acceptance criterion is `AC-<same number>`
in `20_ACCEPTANCE_CRITERIA.md` where one exists.

### 6.1 Connection and onboarding

**FR-001 — Install the Git app** · P0 · Actor: Org admin
Admin installs the Quorum GitHub App and selects repositories. Quorum stores the
installation, requested scopes, and selected repos. **Validation:** installation token must
resolve to at least one accessible repo. **Error:** if the app lacks `pull_requests: write`,
onboarding blocks with a remediation link. **Permissions:** org admin only.

**FR-002 — Repository enablement** · P0
Each repository has an explicit state: `disabled`, `observe` (runs, posts nothing), `active`
(runs and posts). New repos default to `observe`. **Rationale:** teams must be able to
measure before they are interrupted.

**FR-003 — Initial index build** · P0
On enablement, Quorum builds a symbol/graph index of the default branch and reports progress.
**Error:** repos over the size limit (default 2 GB working tree) fall back to diff-scoped
retrieval and warn.

**FR-004 — Guided first review** · P0
Onboarding offers to run Quorum against the most recent merged PR in observe mode and shows
the result before anything is posted publicly.

**FR-005 — Configuration file** · P0
A repo-root `.quorum.yaml` overrides dashboard settings. File wins over UI; UI shows the
effective merged config and which layer set each value. **Validation:** schema-validated;
an invalid file falls back to last-known-good and posts one warning comment per PR, at most
once per 24h per repo.

**FR-006 — Connect additional providers** · P1 (GitLab), P2 (Azure DevOps, Bitbucket).

### 6.2 Ingestion and triage

**FR-010 — Event ingestion** · P0
Consume `pull_request` (opened, synchronize, reopened, ready_for_review), `pull_request_review_comment`, and `issue_comment` events. Webhook handler verifies the signature, persists the event, returns 2xx in <500ms, and enqueues asynchronously.

**FR-011 — Idempotent runs** · P0
A run is keyed by `(repo_id, pr_number, head_sha, config_version, pipeline_version)`. A
duplicate event for an existing key attaches to the existing run instead of starting a new one.

**FR-012 — Superseding runs** · P0
A new head SHA cancels in-flight runs for the same PR at the next node boundary and starts a
new run; already-posted comments are reconciled, not duplicated.

**FR-013 — Triage gate** · P0
A cheap classifier decides `skip` / `light` / `full` based on diff size, changed paths,
file types, PR labels, draft status, and author type (human vs bot). Skips post nothing and
are recorded with a reason. **Default skips:** lockfile-only, generated-file-only, and
vendored-path-only diffs.

**FR-014 — Large-PR handling** · P0
PRs above the attention budget (default 1,500 changed lines or 60 files) are split into
risk-ranked chunks; the budget is spent on the highest-risk chunks and the summary states
explicitly which files were not deeply reviewed.

**FR-015 — Command handling** · P0
Comment commands on the PR: `@quorum review` (full re-review), `@quorum explain <id>`,
`@quorum dismiss <id> <reason>`, `@quorum ignore <rule>`, `@quorum budget <n>` (one-shot).
Unknown commands get a single help reply.

### 6.3 Analysis

**FR-020 — Deterministic analyzer stage** · P0
Before any model call: fetch diff, resolve merge-base, run configured linters, type checkers,
SAST, secret scanning, and dependency audit inside the sandbox; collect existing CI results
through the checks API. Results are ground truth and are attached to state.

**FR-021 — Context retrieval** · P0
For each changed symbol, retrieve definitions, callers, callees, tests exercising it, and
recent blame/history. Retrieval is a LangGraph subgraph, budgeted by token count, and every
retrieved chunk is recorded with file path and line span.

**FR-022 — Review lanes** · P0
Independent lanes execute in parallel over the same state via `Send` fan-out:
`correctness`, `security`, `api_contract`, `tests`. P1 adds `performance`, `data_migration`,
`concurrency`. `style` exists but is advisory-only.
Each lane emits zero or more candidate findings in a fixed JSON schema.

**FR-023 — Lane isolation** · P0
A lane failure (timeout, provider error, schema violation after retries) degrades that lane
only; the run continues and the summary discloses which lanes were incomplete.

**FR-024 — Deduplication and merge** · P0
Candidate findings are clustered by `(file, line-range overlap, normalised claim)`; the
cluster keeps the strongest evidence and records contributing lanes.

**FR-025 — Repository rules** · P1
Team rules written in natural language are compiled into a rule record and evaluated in a
dedicated lane. Each rule may carry positive/negative code examples (its *rule spec*); rules
whose spec fails are disabled and reported.

### 6.4 Verification, ranking, budget

**FR-030 — Adversarial verification** · P0
Every candidate finding is dispatched (one `Send` per finding) to a verifier with a fresh
context, the finding, and mandatory read tools. The verifier must attempt refutation and
return `verdict ∈ {confirmed, refuted, unprovable}` with a required `refutation_attempt`
field. Only `confirmed` findings may post. Verification uses a different model tier or
provider from the lane that produced the finding where configuration allows.

**FR-031 — Evidence classes** · P0
Each finding carries at least one of: `static_tool`, `test_failure`, `symbol_resolution`,
`spec_violation`, `reproduction`, `heuristic`. Findings whose only class is `heuristic` are
never posted (they remain visible in the dashboard). Evidence includes concrete file/line
citations resolvable in the PR's head commit.

**FR-032 — Comment budget and ranking** · P0
Confirmed findings are ranked by `severity_weight × calibrated_confidence × blast_radius`.
The top *N* (default 8, range 1–25, per repo) post inline. The remainder are listed in the
summary as a collapsed count with a dashboard link. Style findings never consume budget.

**FR-033 — Confidence calibration** · P1
A calibration model maps raw verifier confidence to observed acceptance rate per repo and
per finding category, using dismissal reasons as labels. Calibration is per-repo with an
org-level prior; it is displayed and resettable.

**FR-034 — Suppression** · P0
Findings matching an active suppression (rule id, path glob, or a previously dismissed
fingerprint on unchanged code) are dropped before ranking and logged as suppressed.

### 6.5 Policy and publication

**FR-040 — Policy engine** · P0
Per-repo policy determines: which severities may post, whether the check run is neutral or
failing, whether Quorum may request changes, whether it may approve, and whether auto-fix is
permitted. Policy is versioned and every decision records the policy version used.

**FR-041 — Summary comment** · P0
One summary comment per PR, updated in place on subsequent runs (never re-posted): verdict,
counts by severity, lanes run, files deeply reviewed vs skimmed, suppressed count, cost and
duration, and a dashboard link.

**FR-042 — Inline comments** · P0
Posted as a single review (`POST /repos/{owner}/{repo}/pulls/{n}/reviews` with `event: COMMENT`)
so the author receives one notification, not *N*. Comments anchor with `path` + `line` +
`side` (+ `start_line` for ranges) and are re-anchored or withdrawn when the line disappears.

**FR-043 — Check run** · P0
A `quorum/review` check run reports `in_progress` → `completed` with a conclusion set by
policy (`neutral` by default, `failure` only when policy says a blocking severity was found).

**FR-044 — Suggested patches** · P1
Where a fix is mechanical and verified, the comment includes a `suggestion` block. Patches
must apply cleanly to the head SHA at post time or the suggestion is dropped.

**FR-045 — Auto-fix pull request** · P1
For accepted fix suggestions, Quorum can open a fix branch/PR. This requires a human approval
that pauses the graph (`interrupt()`) and resumes on decision. Never enabled by default.

**FR-046 — Bot approval** · P1
Policy may allow approval of PRs where no finding above `low` survived and all deterministic
gates passed. Off by default, org-configurable, and always logged. (Mirrors a capability
GitHub shipped for its own reviewer, S3.)

**FR-047 — Reconciliation on re-run** · P0
On a new run for the same PR: resolved findings are marked resolved and their comments are
minimised/updated; still-valid findings keep their existing comment; new findings post.

### 6.6 Transparency

**FR-050 — Run trace** · P0
Every run exposes a node-by-node timeline: inputs, outputs, tool calls, retrieved context,
token and cost counts, model and prompt version per node, and duration. Available in the
dashboard and via API.

**FR-051 — Finding provenance** · P0
Each finding shows: originating lane, evidence items with citations, the verifier's
refutation attempt, calibrated confidence, and the policy decision that let it post.

**FR-052 — Replay** · P1
An operator can replay a run from any checkpoint with modified config or prompts, in a
sandbox that cannot post to the PR. Uses the LangGraph checkpointer's state history.

**FR-053 — AI disclosure** · P0
Every posted comment identifies itself as machine-generated and links to how it was produced.

### 6.7 Learning

**FR-060 — Feedback capture** · P0
Reactions, replies, resolution reasons, and dismissal commands are recorded against the
finding fingerprint with the actor and timestamp.

**FR-061 — Learnings store** · P1
Confirmed dismissals with a reason of "wrong" or "not our convention" produce a learning
record scoped to repo or org. Learnings are listed, editable, and deletable by maintainers,
and each shows which findings it has suppressed.

**FR-062 — Learning safety** · P1
Learnings may only suppress and re-rank; they may never invent new findings or raise severity
above the policy ceiling. A learning that suppresses a `critical` security finding requires
explicit maintainer confirmation.

### 6.8 Commercial and limits

**FR-070 — Metering and caps** · P0
Every run records credits consumed. Orgs have a hard monthly cap; at 80% the org owner is
notified, at 100% Quorum degrades to `observe` rather than silently billing overage.

**FR-071 — Plan entitlements** · P0
Plan gates: lane set, budget ceiling, self-host license, retention window, SSO, audit-log
export, concurrency.

**FR-072 — Pre-run estimate** · P1
The dashboard shows expected credit cost for a PR of a given size before enabling full mode.

### 6.9 Deployment and privacy

**FR-080 — Self-hosted deployment** · P0
A documented standalone-container deployment (app, LangGraph Server, Postgres, Redis,
object storage, runner) with the same feature set minus managed billing.

**FR-081 — Bring-your-own model** · P0
Configure provider, base URL, model per node class (`triage`, `lane`, `verify`, `summarise`),
and credentials. Credentials are write-only in the UI and stored encrypted.

**FR-082 — No source retention by default** · P0
Checkouts and index shards for a run live only in the sandbox volume and are destroyed at run
end. Persisted excerpts are capped (default 40 lines per evidence item) and redacted for
secrets. A per-org toggle can disable excerpt persistence entirely.

**FR-083 — Data export and deletion** · P0
Org owners can export all org data as JSON/NDJSON and request deletion; deletion removes
findings, runs, traces, learnings, and index artefacts within 30 days and is confirmed by email.

**FR-084 — Adaptive model routing** · P1 · Actor: system
The router selects a model tier per call from deterministic pre-call signals (hunk risk, lane,
path sensitivity, diff complexity, historical lane yield, remaining budget, latency headroom,
provider health) and may retry a call once on a higher tier when a defined escalation trigger
fires. **Validation:** routing is a pure function of recorded signals and the org's routing
policy; the routing policy lives in the effective repo config, so changing it bumps
`config_version`. **Constraints:** one escalation per call; a per-run escalation budget (default
3); never below a node class's floor tier; never to a provider the org has not configured; the
`verify` node never routes below the strong tier. **Error behaviour:** if the escalation model is
unavailable, the routed result stands and the run records `escalation_unavailable`.
**Permissions:** `owner` configures the policy; nobody can configure it per customer plan.
**Acceptance criteria:** `AC-084`.

**FR-085 — Routing transparency** · P1
Every model call records its routed tier, the reason, and the model it escalated from. The run
trace shows which tier produced each posted finding, and S12 shows tier share, escalation rate,
escalation yield, and realised savings versus an all-strong baseline.

### 6.10 Product surfaces

**FR-090 — Reviews inbox** · P0 — filterable list of runs across repos with status, verdict, cost, duration.
**FR-091 — Review detail** · P0 — findings, evidence, trace, raw analyzer output, re-run action.
**FR-092 — Analytics** · P1 — precision proxy (accepted vs dismissed), comments per PR, time-to-first-comment, spend, per-lane yield.
**FR-093 — Audit log** · P0 — every policy change, posted action, credential change, export, and deletion.
**FR-094 — CLI** · P0 — `quorum review --pr <n>` and `quorum review --diff <file>` running the same graph locally, printing findings to stdout or as SARIF.
**FR-095 — Notifications** · P1 — Slack/webhook on run failure, budget threshold, and critical findings.

## 7. Non-functional requirements

| ID | Requirement |
|---|---|
| NFR-01 | p50 time-to-first-comment ≤90s, p95 ≤5min for PRs <1,000 changed lines; deterministic stage results available ≤30s |
| NFR-02 | 99.5% monthly availability of ingestion; webhook 2xx within 500ms at p99 |
| NFR-03 | No event loss: webhook payloads are persisted before acknowledgement and replayable for 7 days |
| NFR-04 | A worker crash resumes a run from the last checkpoint; at most one node is re-executed |
| NFR-05 | Horizontal scale to 10k reviews/day per deployment with per-org concurrency fairness |
| NFR-06 | All model calls behind a provider interface; swapping providers requires no graph change |
| NFR-06a | Model routing is deterministic: the same run key and routing policy reproduce the same tier decisions, and a re-run reuses the recorded route plan |
| NFR-07 | Sandbox: no network egress except an allowlisted package proxy; rootless; read-only root filesystem; per-run ephemeral volume; CPU/memory/time capped |
| NFR-08 | All data encrypted in transit (TLS 1.3) and at rest (AES-256); secrets in a managed KMS/secret store, never in the database in plaintext |
| NFR-09 | Cost per average review ≤ the plan's credit value; a hard per-run token ceiling aborts and reports rather than overspends |
| NFR-10 | Dashboard meets WCAG 2.2 AA |
| NFR-11 | Every LLM output is schema-validated; unparseable output is retried once, then the lane degrades |
| NFR-12 | Pipeline version and prompt versions are recorded on every run and are immutable |
| NFR-13 | Backups: Postgres PITR with ≤5min RPO, ≤1h RTO; restores rehearsed quarterly |
| NFR-14 | Localisation-ready UI (English at launch, no hard-coded strings) |

## 8. Success metrics (KPIs)

| Metric | Definition | Target |
|---|---|---|
| Posted-comment acceptance | Comments resolved as "fixed"/"useful" ÷ posted comments | ≥70% at GA, ≥80% by 6 months |
| Eval precision | Confirmed true positives ÷ posted findings on internal corpus | ≥90% |
| Recall proxy | Share of known-defect corpus items surfaced anywhere in the dashboard | ≥60% at GA |
| Comments per PR | Median posted inline comments | 2–5 |
| Time to first comment | p50 / p95 | ≤90s / ≤5min |
| Mute rate | Repos moved from `active` to `observe`/`disabled` within 30 days | <5% |
| Review-cycle time delta | Median PR open→merge vs pre-install baseline | −15% |
| Cost per review | Credits × unit cost | ≤$0.35 median (≤$0.25 with adaptive routing enabled) |
| Escalation yield | Confirmed findings originating from escalated calls ÷ escalations | ≥30% (below this, escalation triggers are miscalibrated) |
| Trace usage | Share of dismissed comments where the user opened the evidence | ≥25% (a transparency health signal) |

## 9. Accessibility

WCAG 2.2 AA for the dashboard: full keyboard operation of the diff/finding viewer, visible
focus, 4.5:1 text contrast, semantic landmarks, live-region announcements for run status,
`prefers-reduced-motion` respected, no colour-only severity encoding (icon + label + colour).
PR comments use plain-text-first Markdown that degrades in email notifications.

## 10. Security requirements

Least-privilege GitHub App scopes; short-lived installation tokens never persisted beyond
the run; per-org isolation enforced at the query layer and verified by tests; untrusted
repository content (including PR titles, descriptions, and code) treated as data, never as
instructions — see the prompt-injection controls in `08_SAFETY_PRIVACY_COMPLIANCE.md`;
signed webhooks; audit logging of every privileged action; dependency and container scanning
in CI; annual third-party penetration test before enterprise GA.

## 11. Localisation

English (US) at launch. All UI strings externalised to message catalogues from day one.
Review comments are generated in the repo's configured review language (default English);
the comment language setting is per repo. Dates/times localised to the viewer's locale and
timezone; all storage in UTC.
