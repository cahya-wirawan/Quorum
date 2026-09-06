# 21 Risks and Open Questions — Quorum

Likelihood × Impact are judgements recorded on 2026-09-06 to be revisited each phase gate.

---

## 1. Product risks

| # | Risk | L | I | Mitigation | Trigger to act |
|---|---|---|---|---|---|
| P1 | **Precision positioning is unfalsifiable to buyers.** Every competitor claims accuracy; ours sounds the same in a sales deck | High | High | Publish the eval method and corpora construction; ship the acceptance-rate metric in-product so customers measure us on their own PRs; back it with the quality refund policy | Beta buyers cannot articulate the difference after a demo |
| P2 | **Fewer comments reads as "it found nothing".** Silence can look like weakness next to a noisy competitor | High | Medium | The summary always states what was checked; the dashboard shows held findings so value is visible without posting; onboarding shows the would-have-posted comparison | Trials ranking us below a noisier tool on "found more" |
| P3 | **Held findings become a graveyard** nobody reads, making the budget a way to hide misses | Medium | Medium | Track held-finding promotion rate as a health metric; if it exceeds 10%, the budget is too tight | Promotion rate >10% for two consecutive months |
| P4 | Verification halves recall along with false positives | Medium | High | Recall is a gate, not an afterthought (≥60% on `bench-injected`); refute rate is monitored with an expected band of 25–55% | Refute rate >55% |
| P5 | The category commoditises as first-party (platform-bundled) review improves | High | High | Compete on precision, self-hosting, BYO model, and governance — the axes a bundled feature is slowest to move on | Platform reviewer reaches parity on our eval corpus |
| P6 | Free tier is abused for compute by fork spam | Medium | Medium | Per-installation rate limits, anomaly pause, deterministic-only fallback for anonymous forks | Free-tier cost per org exceeds plan value |

## 2. Technical risks

| # | Risk | L | I | Mitigation | Trigger to act |
|---|---|---|---|---|---|
| T1 | **Verification doubles or triples cost per review** | High | High | Verify only non-heuristic candidates, cap fan-out at 25, cache aggressively, use a strong model only for verification and a cheap one for triage; per-run token ceiling | Median cost per review >$0.45 |
| T2 | LangGraph API surface changes (durability modes and interrupt semantics moved during 2026) | Medium | Medium | Pin the version; wrap `interrupt`, checkpointing and durability behind an internal module; contract tests around resume and interrupt; re-read the docs each upgrade | A minor upgrade breaks a resume test |
| T3 | Checkpoint growth and Postgres pressure at scale | Medium | Medium | Separate checkpoint database, retention purge, partitioning, `exit` durability for cheap nodes if needed | Checkpoint write p95 >1s |
| T4 | Retrieval quality is the real ceiling on finding quality | High | High | Invest in the symbol graph early; measure per-lane yield against retrieval recall; import SCIP/LSIF where repos publish it | Lane yield flat while retrieval token budget rises |
| T5 | Monorepo indexing cost and latency | Medium | Medium | Incremental indexing, per-repo storage caps, diff-scoped fallback | Index build >4h or >5 GiB per repo |
| T6 | Model provider outage or deprecation mid-quarter | Medium | High | Provider abstraction with fallback chains, cross-provider verification, self-hosted endpoint support | Any provider incident exceeding 30 minutes |
| T7 | Sandbox escape through a malicious repository | Low | Critical | Rootless, no egress, read-only rootfs, no service-account token, dropped capabilities, escape tests in CI, annual pentest | Any sandbox anomaly |
| T8 | Prompt injection succeeds in influencing a posted comment | Medium | High | Deterministic publication, read-only tools, sanitisation, injection classifier, adversarial gate at every release | Any adversarial case failing |
| T9 | Non-determinism erodes trust ("it said something different yesterday") | Medium | Medium | Temperature 0, lane result caching by diff hash, deterministic ranking, determinism test in CI | Variance >1 finding across runs |
| T11 | **Adaptive routing degrades quality invisibly** — the cheap tier misses defects that never become findings, so nothing looks wrong | Medium | High | Shadow mode before promotion; per-tier eval on all three corpora; escalation-yield and tier-share monitoring; a `sensitive_path_silent` trigger that escalates when a cheap tier finds nothing on a sensitive path; floors on `security` and `verify` | Precision or recall drops >1 point after a policy promotion |
| T12 | Routing makes runs non-reproducible ("it escalated yesterday and not today") | Medium | Medium | Pure routing function, route plans cached and reused on re-run and replay, `quorum_route_plan_reuse_ratio` alert, determinism gate extended to tier decisions | Reuse ratio <0.9 |
| T13 | Escalation storms during a provider slowdown multiply cost and latency | Low | Medium | Per-run escalation budget, latency-headroom signal that stops escalating late in a run, circuit breaker removes unhealthy providers from routing | Escalation rate >40% for an hour |
| T10 | Git-host secondary rate limits throttle large customers | Medium | Medium | One review per run, per-repo posting lock, backoff honouring `Retry-After`, queueing rather than failing | Repeated 403 secondary-limit events |

## 3. Compliance and safety risks

| # | Risk | L | I | Mitigation |
|---|---|---|---|---|
| C1 | Customer source code sent to a third-party model provider blocks enterprise deals | High | High | Self-hosting and BYO endpoint from GA; region pinning; no-retention default; contractual no-training with the default provider |
| C2 | A false `critical` security finding causes a bad emergency deployment | Low | High | Verification, evidence gating, calibrated confidence shown, blocking off by default, finding-quality incident runbook |
| C3 | AI transparency obligations (EU AI Act and successors) tighten | Medium | Medium | Disclosure on every comment, documented purpose/limits/oversight, no autonomous writes, full run traceability |
| C4 | A learned suppression silently hides a real vulnerability | Low | High | Learnings may only suppress or downrank, are visible and editable, and require typed confirmation to touch `high`+ security findings |
| C5 | Review data repurposed as developer surveillance by a customer | Medium | Medium | No per-author quality metrics anywhere in the schema; analytics aggregate by repo and lane; stated in the terms |
| C6 | Sub-processor change objection windows conflict with a needed provider switch | Low | Medium | 30-day notice process; BYO endpoint as the customer's escape hatch |

## 4. Operational and cost risks

| # | Risk | L | I | Mitigation |
|---|---|---|---|---|
| O1 | A prompt or model change silently degrades quality across all customers | Medium | High | Blocking eval gate, 5% canary with live acceptance comparison, golden-set human review, one-command pipeline rollback |
| O2 | Cost per review drifts as models change | High | Medium | Per-run ceilings, per-org caps, cost dashboards with p95 alerting, nightly reconciliation |
| O3 | Support burden from "why did it say that" questions | Medium | Medium | The trace is the answer; support macros link directly to the finding provenance |
| O4 | On-call load from a queue that must never lose events | Medium | Medium | Persist-before-ack, dead-letter replay, watchdogs, runbooks per alert |
| O5 | Self-hosted customers running old versions with known issues | Medium | Medium | Version compatibility matrix, upgrade guide, licence warning on versions older than two releases |

---

## 5. Open decisions

| # | Decision | Options | Recommendation | Needed by |
|---|---|---|---|---|
| D1 | Default comment budget | 5 / 8 / 10 | Start at 8; tune from held-promotion rate after beta | M4 |
| D2 | Should `unprovable` findings ever post? | Never / at `critical` severity with an explicit hedge | Never in MVP; revisit if recall gates fail | M2 |
| D3 | Cross-provider verification: default or premium? | Default everywhere / Business+ only | Business+ initially (cost), move to default if the precision delta is material | M6 |
| D4 | Seat definition | Active author+reviewer / all org members / repo contributors | Active author+reviewer per period (fairest, hardest to game) | M4 |
| D5 | GitLab before or after auto-fix | GitLab first / auto-fix first | Decide from beta demand; GitLab likely first for market reach | M6 kickoff |
| D6 | Style lane: keep at all? | Keep advisory / remove entirely | Keep advisory; it costs little and feeds convention learning | M5 review |
| D7 | Index storage for very large monorepos | Postgres+pgvector only / dedicated vector store | Stay on pgvector until a repo exceeds 5M chunks | M3 |
| D8 | Whether to publish our benchmark corpora publicly | Fully open / method only / closed | Publish method and construction scripts; keep `bench-clean` labels private to prevent overfitting | M5 |
| D9 | Free-tier private repo allowance | 0 / 1 / 3 | 1, to make the free tier real without funding competitors' evaluations | M4 |
| D10 | Blocking checks in a default policy | Never default / default at `critical` | Never default; blocking is always an explicit escalation | M4 |
| D11 | Retention default for traces | 14 / 30 / 90 days | 30 days: long enough to answer disputes, short enough to limit exposure | M4 |
| D12 | Whether the verifier sees analyzer output | Yes / no | Yes for `static_tool` evidence only; withholding it produced redundant refutations in design review | M2 |
| D13 | Is the routing policy customer-tunable or vendor-managed? | Full tuning in S12 / mode switch only / fully managed | Ship the mode switch plus the escalation budget; keep trigger-level tuning behind a flag until the yield data says customers can tune it without hurting themselves | M6 |
| D14 | Should adaptive routing be on by default for new orgs? | On / off / on above a volume threshold | Off at M6, on by default once two consecutive quarters show the precision gate held in production | M7 |
| D15 | **Is "Quorum" the final product name?** It is a working title, chosen for the procedural sense of the word: a finding has no standing until lane, evidence, verifier, policy and budget are all present (`00_REFERENCE_ANALYSIS.md` §8) | Keep Quorum / distinctive alternative (Standing, Warrant, Attest, Corroborate) / purely descriptive name | Keep Quorum, paired with a descriptive tagline that carries the search and comprehension load. Before GA, resolve: trademark search in the relevant classes; domain and GitHub-org availability; whether the bot identity reads unambiguously in a PR thread beside human reviewers; and whether users grasp the procedural meaning unprompted. A descriptive name is rejected as unregistrable, undiscoverable in support search, and indistinguishable from a first-party platform feature | M5 (GA), since the marketplace listing, comment identity and docs all bake it in |

Renaming stays cheap while the package is documentation only. The surfaces that would need a
migration path once installs exist are the `.quorum.yaml` config key, the `@quorum` command prefix,
and the `quorum/review` check-run id (renaming a check run breaks branch-protection rules that
reference it by name). Everything else — directory, docs, dashboard copy — is a find-and-replace.

## 6. Unknowns to resolve with data

1. What refute rate correlates with the best acceptance rate in production? The 25–55% band is a
   design-time judgement, not a measurement.
2. Does per-repo calibration beat per-org with enough samples, and what is the minimum sample size
   before calibration helps rather than overfits?
3. How much recall does the comment budget actually cost in practice, measured by held findings
   later fixed by humans?
4. Which lanes justify their cost? Per-lane yield after beta decides whether `style` and
   `api_contract` survive as separate lanes.
5. Do teams use rule specs, or do they abandon them after the first failing spec?
6. Is the trace used by customers, or only by support? If only by support, S06 can be simplified.
7. Which escalation triggers actually earn their cost? The six in
   `07_AI_OR_AUTOMATION_PIPELINE.md` §7.3 are design-time judgements; escalation yield per trigger
   decides which survive.
8. Is per-repo historical lane yield a safe de-escalation signal, or does it entrench a cold start
   in which a lane that was never given a strong model never produces an accepted finding?
