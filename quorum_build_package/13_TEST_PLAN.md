# 13 Test Plan — Quorum

Quality bar: the pipeline's job is to be *right*, so the test strategy is weighted toward
determinism, isolation, and evaluation rather than UI coverage.

---

## 1. Unit tests (pytest, vitest) — target ≥85% line coverage on `core/`, 100% on ranking, budget, policy, fingerprinting

| Area | Cases |
|---|---|
| Fingerprinting | Stable across line shifts; changes when the surrounding code changes; collision behaviour |
| Ranking | Severity weights, calibration application, tie-breaks, deterministic ordering for equal scores |
| Budget | Exactly `N` posted; style never counted; held ordering; budget 1 and 25 boundaries |
| Suppression | Fingerprint, path glob, rule and category matching; expiry; precedence |
| Policy | Every combination of min severity × blocking × approve × autofix; escalations require owner |
| State reducers | Concurrent lane writes merge without loss; duplicate `Send` results deduped; error accumulation |
| Config merge | default → org → UI → file precedence; invalid file falls back to last-known-good |
| Evidence gating | `heuristic`-only never posts; unresolvable line spans rejected |
| Verifier contract | Empty `refutation_attempt` rejected; no tool call → `unprovable`; anchoring at head |
| Sanitisation | Injection patterns stripped; secrets masked; excerpt cap enforced |
| Comment rendering | Escaping, no raw HTML, no third-party mentions, link allowlist |
| Credits | Cost accumulation, cap enforcement, idempotent metering |
| Routing | `route()` is pure and stable across processes for identical signals; floors are never violated; `style` capped at tier 1; `verify` never below strong; escalation capped at one per call and at the run budget; unconfigured providers are unreachable; a model's `escalation_request` alone cannot exceed the budget |

## 2. Integration tests

- **Graph:** run the compiled `StateGraph` against fixture repositories with stubbed providers
  (recorded responses). Assert node sequence, `Send` fan-out counts, state after each node,
  checkpoint contents, and final publication payload.
- **Resume:** kill the worker at each node boundary in turn; assert the run resumes, at most one
  node re-executes, and no comment is duplicated.
- **Adaptive routing:** run a fixture PR under `static`, `adaptive` and `shadow` modes; assert the
  posted set is identical between static-at-strong and adaptive where no trigger fires; assert an
  ambiguous-confidence finding escalates exactly once and the escalated result replaces the cheap
  one in state while both remain in the trace; assert a re-run reuses the recorded route plan.
- **Interrupt:** trigger the auto-fix approval pause, resume with approve/reject/timeout; assert
  writes happen only on approve and exactly once.
- **Git host:** run against a recorded-fixture GitHub API and a contract-tested fake; assert one
  review per run, correct `path`/`line`/`side` anchoring, summary edited in place rather than
  re-posted, check-run transitions, and correct backoff on 403 secondary rate limit and 429.
- **Sandbox:** analyzer execution, timeouts, egress denial (a test that attempts an outbound
  connection and must fail), volume destruction, orphan sweeping.
- **Database:** migrations forward/back against a production-shaped dataset; RLS prevents
  cross-org reads; every repository-layer query carries an `org_id` predicate.
- **Billing:** Stripe test-mode lifecycle — checkout, webhook, entitlement change, past_due
  degradation, cancellation, metered usage idempotency, nightly reconciliation.

## 3. End-to-end tests (Playwright + a real staging GitHub App on a seeded repo)

E2E-01 Install → select repos → index → guided first review → activate.
E2E-02 Open a PR with a seeded defect → comment appears within SLA → evidence resolves → dismiss
with a reason → suppression created → re-run does not repeat it.
E2E-03 Push a fix → re-run → finding resolved, comment minimised, no duplicate.
E2E-04 Budget: PR with 20 confirmed findings → exactly `budget` posted, rest held and reachable.
E2E-05 Auto-fix: approval pause → approve → fix PR opened and linked → audit entry present.
E2E-06 Command flow: `@quorum explain`, `dismiss`, `review` each behave and are idempotent.
E2E-07 Billing: hit a gate → upgrade → capability unlocks → cap reached → degrades to observe.
E2E-08 Privacy: export produces a complete archive; deletion schedules, shows the banner,
cancels, then completes and leaves no findings.
E2E-09 Failure: provider outage mid-run → lane degrades → summary names the degraded lane.
E2E-10 CLI: `quorum review --diff` offline with a local model and in deterministic-only mode.

## 4. AI evaluation (the gate that matters)

Corpora, metrics and CI gates are defined in `07_AI_OR_AUTOMATION_PIPELINE.md` §9. Operationally:

- The eval suite runs nightly on `main` and on every PR touching prompts, lanes, ranking, or the
  provider layer. It is a **blocking** check.
- **Precision gate:** `bench-clean` false-positive rate ≤5%; posted-finding precision ≥90%.
- **Recall gate:** ≥60% on `bench-injected`, ≥40% on `bench-historical`.
- **No-regression gate:** no metric down more than 2 points versus the previous `pipeline_version`.
- **Cost/latency gate:** median run cost within 15% and p95 latency within 20% of baseline.
- **Calibration:** ECE ≤0.08 on held-out feedback.
- **Adversarial/robustness suite:** prompt-injection corpus (instructions embedded in code
  comments, PR bodies, file names, and test fixtures) — the pass condition is zero instances of
  instruction-following, zero leaked system prompts, and correct quarantining.
- **Determinism:** the same PR at `temperature=0` produces the same posted set across three runs
  (allowing for cache) — variance above 1 finding fails. With adaptive routing enabled the run must
  additionally reuse the recorded route plan, and a re-run whose tier decisions differ fails.
- **Routing policy gate:** a candidate policy is promoted only if precision and recall stay within
  1 point of the all-strong baseline on all three corpora while median cost falls ≥25%. Every
  prompt is evaluated at each tier it is permitted to run on.
- **Human review:** 50 sampled findings per release are labelled by two engineers; disagreement
  with the verifier above 15% blocks release.

## 5. Security testing

- SAST + dependency scanning + container scanning + IaC scanning on every PR; SBOM produced and
  signed at build.
- Secrets detection in CI, including in test fixtures.
- Authorisation matrix tests: every route × every role, asserting exact allow/deny against
  `09_AUTH_AND_PERMISSIONS.md` §3; a route without an explicit permission binding fails the build.
- Tenant-isolation fuzzing: randomised cross-org identifiers must always 404, never 403 with
  information leakage.
- Webhook signature tests: wrong signature, replayed delivery, stale timestamp, oversized payload.
- Sandbox escape tests: attempted egress, attempted filesystem writes outside the volume,
  attempted access to the service-account token, fork bombs and resource exhaustion.
- Annual third-party penetration test before enterprise GA; findings tracked to closure.

## 6. Performance and load

- Sustained 10 reviews/second ingestion with queue lag <60s; burst of 500 PRs from a single push
  (mass rebase) must not starve other orgs — fairness assertion.
- Large-PR profile: 5,000 changed lines across 200 files completes within 12 minutes and produces
  a summary naming the skimmed files.
- Monorepo index: 1M-file repository indexes within 4 hours and incremental updates within 2 minutes.
- Database: query plans asserted for the inbox and finding queries at 10M-row scale; no sequential
  scans on hot paths.
- Soak: 24-hour run at 50% capacity with no memory growth beyond 10% and no checkpoint bloat.

## 7. Network, offline and resilience

Chaos scenarios executed in staging: provider 500s and timeouts, Git host 5xx and rate limiting,
Postgres failover, Redis eviction, object-storage latency injection, worker kill -9, node
eviction mid-`Send` fan-out, clock skew. Each has an expected user-visible outcome documented in
`03_USER_FLOWS.md` §8, and the test asserts that outcome — not merely that nothing crashed.
Dashboard offline behaviour tested with the network disabled and with the API returning 503.

## 8. Accessibility testing

Automated axe scans on every screen in CI (zero critical/serious violations), plus a manual pass
per release: keyboard-only traversal of S04/S05/S06 including the diff viewer, screen-reader pass
(NVDA + VoiceOver) on the review-detail and finding flows, 200% zoom and 320px reflow, contrast
audit, `prefers-reduced-motion`, and focus-visibility checks. WCAG 2.2 AA is a release gate.

## 9. Billing tests

Stripe test clocks drive: trial → active → past_due → grace → degradation → recovery; proration
on seat change; cancellation and reactivation; metered usage idempotency under retry; refund path;
webhook replay; reconciliation drift detection.

## 10. Regression and release process

- Every production defect gets a regression test in the same PR as the fix; every false-positive
  incident adds a case to `bench-clean`.
- A frozen "golden set" of 30 real PRs with hand-labelled expected output runs on every release
  and its diff is reviewed by a human — the last line of defence against a plausible-looking
  quality regression that all aggregate metrics miss.
- Release requires: all gates green, eval report attached, migration dry-run clean, rollback
  rehearsed, and `18_RELEASE_CHECKLIST.md` signed off.
