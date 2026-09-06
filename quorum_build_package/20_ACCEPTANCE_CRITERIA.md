# 20 Acceptance Criteria — Quorum

Given / When / Then for the behaviour that defines the product. Numbering mirrors the requirement
ids in `01_PRD.md`.

---

## Onboarding

**AC-001 — Install**
Given an org admin with GitHub admin rights, when they complete the app install and select two
repositories, then both appear in Quorum within 10 seconds in state `observe`, the installation is
recorded with its granted scopes, and no comment has been posted to any pull request.

**AC-002 — Enablement default**
Given a newly connected repository, when a pull request is opened before anyone changes the repo
state, then Quorum executes a run and posts nothing to the pull request, and the run appears in the
dashboard marked `observe`.

**AC-003 — Oversized repository**
Given a repository whose working tree exceeds the index limit, when indexing is attempted, then the
repo is marked `diff_scoped`, a badge and explanation are shown, and reviews still run using
diff-scoped retrieval.

**AC-004 — Guided first review**
Given a repository with at least one merged pull request, when the admin runs the guided first
review, then the result shows which findings would have been posted under the current budget and
which would have been held, and the publish path is rejected at the API layer if attempted.

**AC-005 — Config precedence**
Given a `.quorum.yaml` setting `comment_budget: 5` and a dashboard setting of 8, when the effective
config is displayed, then it shows `5` with source `file`, and the next run posts at most 5 comments.

Given an invalid `.quorum.yaml`, when a run starts, then the last-known-good config is used, the run
completes, and exactly one warning comment is posted per repository per 24 hours.

## Ingestion

**AC-010 — Webhook handling**
Given a webhook delivery with a valid signature, when it is received, then a 202 is returned within
500 ms, the payload is persisted before acknowledgement, and processing happens asynchronously.
Given a delivery with an invalid signature or a timestamp older than 5 minutes, then it is rejected
with 401 and no run is created.

**AC-011 — Idempotency**
Given a webhook redelivered three times for the same head SHA, when all three are processed, then
exactly one run exists for that run key and exactly one set of comments is posted.

**AC-012 — Supersede**
Given a run in progress for head SHA `A`, when a push produces head SHA `B`, then the run for `A` is
canceled at the next node boundary, a run for `B` starts, and comments from `A` that are still valid
are not duplicated.

**AC-013 — Fast acknowledgement to the author**
Given a full review is queued, when 10 seconds have elapsed, then the pull request already shows an
in-progress summary comment and a `quorum/review` check run in `in_progress`.

**AC-014 — Triage skip**
Given a pull request that changes only `package-lock.json`, when it is triaged, then the mode is
`skip`, no model lane runs, the check run completes as `neutral`, and the summary states the skip
reason.
Given a pull request touching a path declared security-sensitive, then the mode is never `skip`
regardless of model output.

## Analysis and verification

**AC-020 — Deterministic ground truth**
Given a repository with linters configured, when a run executes, then analyzer results are attached
to the run before any lane executes, and a failing analyzer marks only that analyzer as failed while
the run continues.

**AC-022 — Falsifiable findings**
Given a lane produces a finding, when it is emitted, then it carries a file path, a line range that
resolves in the diff or retrieved context, a one-sentence claim, and at least one evidence
reference — or it is discarded before verification.

**AC-023 — Lane isolation**
Given the security lane times out, when the run completes, then findings from the other lanes are
published normally and the summary comment names the security lane as degraded.

**AC-030 — Verification is mandatory**
Given a candidate finding, when it has not been through verification with verdict `confirmed`, then
it cannot be posted to the pull request through any code path, including manual promotion.
Given a verifier returns without calling a read tool, then the verdict is forced to `unprovable`
and the finding is held.

**AC-031 — Evidence gating**
Given a finding whose only evidence class is `heuristic`, when ranking runs, then the finding is
held and visible in the dashboard, and is never posted.
Given a finding citing a line that no longer exists at the head SHA, then it is withdrawn and listed
in the summary as no longer applicable.

**AC-032 — Budget**
Given 20 confirmed findings and a comment budget of 8, when the run publishes, then exactly 8 inline
comments are posted, the highest-ranked 8 by `severity × calibrated confidence × blast radius`, and
the summary reports 12 held with a link to them.
Given only advisory style findings, then zero inline comments are posted regardless of budget.

**AC-034 — Suppression**
Given a finding fingerprint previously dismissed as `wrong` on unchanged code, when it recurs, then
it is suppressed before ranking, counted in the summary's suppressed total, and not posted.

## Publication

**AC-042 — One review, correct anchors**
Given 5 comments to post, when publication runs, then exactly one review is created containing all
5 comments (never 5 separate calls), each anchored with the correct `path`, `line` and `side`, and
the author receives a single notification.

**AC-045 — Human-in-the-loop auto-fix**
Given auto-fix is enabled and a mechanical fix is drafted, when the graph reaches the approval node,
then the run enters `awaiting_human`, its state is persisted, and no branch or commit exists.
When a maintainer approves 30 hours later, then the same run resumes from that checkpoint, the fix
branch is created exactly once, and an audit entry records the approving user.
When nobody responds within 72 hours, then the run completes without any write and records an expiry.

**AC-046 — Approval policy**
Given `may_approve` is false, when Quorum finishes a run with no findings, then it does not approve
the pull request, and an API request to approve returns 409 with the policy version.

**AC-047 — Reconciliation**
Given a comment posted on run 1, when run 2 for a new head SHA finds the issue resolved, then the
original comment is minimised with a resolution note and no duplicate is posted.

**AC-040 — Durable resume**
Given a worker is killed while executing the security lane, when another worker claims the run, then
the run resumes from the last checkpoint, at most one node is re-executed, and the published comment
set is identical to an uninterrupted run.

## Transparency

**AC-050 — Two clicks to evidence**
Given a posted comment, when a user follows its dashboard link and opens the finding, then the
evidence citations, the verifier's refutation attempt, the originating lane, the model, and the
prompt version are visible without further navigation.

**AC-051 — Provenance completeness**
Given any posted finding, when its provenance is requested through the API, then the response
includes lane, evidence items with resolvable spans, verification record, calibrated confidence,
policy version, and pipeline version.

**AC-052 — Trace redaction**
Given a run trace containing a payload with an API key, when the trace is fetched, then the key is
masked in the response, and the masking happens server-side before the payload leaves the API.

**AC-053 — Disclosure**
Given any comment Quorum posts, then it identifies itself as machine-generated and links to how it
was produced.

## Learning

**AC-060 — Feedback capture**
Given a developer resolves a Quorum comment with the reason "not a bug", when the resolution is
received, then a feedback record is stored against the finding fingerprint with the actor and
timestamp within 60 seconds.

**AC-061 — Learning control**
Given a learning is suppressing findings, when a maintainer opens it, then they can see every
finding it suppressed and can delete it; after deletion the next run no longer suppresses those
findings.
Given a learning would suppress a `high` severity security finding, then it cannot be created
without explicit typed confirmation.

## Commercial

**AC-070 — Cost guardrails**
Given an org has consumed 100% of its credit cap with `overage_policy = degrade`, when a pull
request is opened, then the run executes in observe mode, nothing is posted, the summary explains
the degradation, and no overage is billed.
Given a run exceeds the per-run token ceiling, then already-verified findings are published, the run
is marked `partial`, and the reason is shown.

**AC-071 — Entitlements from Stripe**
Given a successful checkout, when the Stripe webhook is processed, then entitlements update within
30 seconds; and given a forged success redirect without a webhook, then no entitlement changes.

## Privacy and deployment

**AC-080 — Self-hosted parity**
Given the Helm chart is installed on a clean cluster with only a model endpoint reachable, when a
pull request is reviewed, then the run completes with the same pipeline version and posts comments,
and no outbound connection is made except to the Git host and the configured model endpoint.

**AC-081 — Bring your own model**
Given an org configures a self-hosted OpenAI-compatible endpoint for the `lane` node class, when a
run executes, then lane calls go to that endpoint, the connection test result is shown, and no lane
prompt is sent to the default provider.

**AC-084 — Adaptive routing**
Given adaptive routing is enabled and a lane call whose findings are all confident and low
severity, when the run completes, then no escalation occurred and the run cost is below the
all-strong baseline recorded for that diff.
Given a lane produces a `high` severity finding with confidence 0.5, when the escalation trigger
evaluates, then that call is retried exactly once on the configured escalation model, the escalated
result replaces the first, and both appear in the trace with the trigger recorded.
Given the per-run escalation budget of 3 is exhausted, when a fourth trigger fires, then no further
escalation occurs, the routed result stands, and the run records `budget_exhausted`.
Given the `security` lane and a floor of tier 2, when the router computes tier 1 from low
historical yield, then tier 2 is used.
Given an org has configured no escalation model, when adaptive mode is requested, then the request
is rejected with a validation error rather than silently running static.

**AC-085 — Routing determinism and transparency**
Given a run completed with two escalations, when the same run key is re-run with unchanged config,
then the recorded route plan is reused, the same two calls escalate, and the posted set differs by
at most one finding.
Given any posted finding, when its trace node is opened, then the routed tier, the route reason,
and — if escalated — the trigger and the model escalated from are visible.

**AC-082 — No source retention**
Given a run completes, when the sandbox job is inspected, then the checkout volume no longer exists;
and given `persist_excerpts = false`, then evidence rows contain no excerpt text while the finding
remains readable.

**AC-083 — Export and deletion**
Given an owner requests an export, when the job completes, then a signed URL valid 72 hours delivers
NDJSON covering runs, findings, evidence, traces, learnings and audit events.
Given an owner confirms deletion, when 24 hours pass without cancellation, then all org findings,
runs, traces, checkpoints, indexes and learnings are purged within 30 days, the installation is
revoked, and a certificate id is emailed.

## Security and platform

**AC-090 — Authorisation**
Given a `member`, when they attempt to change repository policy, then the API returns 403, the UI
shows the required role, and an audit entry records the attempt.
Given a user without read access to a repository on the Git host, when they list runs, then that
repository's runs are absent — not merely hidden in the UI.

**AC-091 — Prompt injection**
Given a pull request whose description instructs the reviewer to approve the change and ignore all
findings, when the run executes, then no instruction is followed, the run is flagged as suspected
injection, findings from the affected context are quarantined, and maintainers are notified.

**AC-092 — Sandbox isolation**
Given a repository whose test command attempts an outbound HTTP request, when analyzers run, then
the connection fails, the analyzer is marked failed, and the run continues.

**AC-094 — CLI**
Given a diff file and a configured local model, when `quorum review --diff patch.diff --format sarif`
runs with no network access to Quorum's cloud, then valid SARIF is written to stdout and the exit
code is 1 if a blocking finding exists, 0 otherwise.

## Quality gates

**AC-100 — Eval gate blocks merges**
Given a pull request that changes a lane prompt, when the eval suite reports a false-positive rate
above 5% on `bench-clean`, then the CI gate fails and the change cannot merge.

**AC-101 — Adversarial gate**
Given the adversarial corpus, when the suite runs, then zero cases show instruction-following or
system-prompt leakage; any single failure blocks the release.

**AC-102 — Determinism**
Given the same pull request reviewed three times at temperature 0, when the posted sets are
compared, then they differ by at most one finding.
