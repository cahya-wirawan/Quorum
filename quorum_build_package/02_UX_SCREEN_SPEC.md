# 02 UX Screen Specification — Quorum

Surfaces: **W** = web dashboard, **G** = in-Git-host surface, **C** = CLI.
Every screen below is **Proposed** unless marked otherwise — the reference products' internal
screens were not inspected, only their public shape (`00_REFERENCE_ANALYSIS.md` §3).

Global conventions:
- **Offline / provider-unreachable:** the dashboard is read-only-degraded. A persistent banner
  states what is unavailable ("GitHub is unreachable — queued runs will resume automatically").
  Mutations that require the Git host are disabled with an explanatory tooltip rather than
  failing on submit. Data already fetched stays visible from cache with an "as of <time>" stamp.
- **Error:** every error surface shows a human cause, a correlation id (`run_id` or
  `request_id`), one recovery action, and a "copy diagnostics" button.
- **Loading:** skeletons that match final layout; never a full-page spinner over content
  already fetched. Runs stream live via SSE; if the stream drops, fall back to 5s polling and
  show a subtle "reconnecting" pip.
- **Permission denied:** the surface renders with the action disabled and a line naming the
  role required, plus "ask an owner" which drafts an in-app request.
- **Severity is never colour-only:** icon + word + colour.

---

## S01 — Connect a Git provider (W)
**Purpose:** get an org from zero to an installed app.
**Role:** org admin. **Entry:** signup, empty dashboard, Settings → Integrations. **Exit:** S02.
**Elements:** provider cards (GitHub — available; GitLab — P1; Azure DevOps/Bitbucket — P2),
required-scope list with a plain-English reason per scope, self-hosted vs cloud choice,
"Install app" primary button, link to the security summary.
**Actions:** start OAuth/App install; return via callback; retry; contact support.
**Validation:** callback state parameter verified; installation must expose ≥1 repository.
**Loading:** button enters pending state; the callback screen shows "Confirming installation".
**Empty:** first-run copy explaining what will happen ("Quorum will not post anything until you
switch a repository to Active").
**Error:** scope missing → shows exactly which permission is absent and a re-authorise link;
installation belongs to another Quorum org → explains and offers to request access.
**Offline:** install disabled, banner shown.
**Accessibility:** provider cards are radio-group semantics; scope list is a description list.
**Analytics:** `connect_started`, `connect_completed`, `connect_failed{reason}`.

## S02 — Repository selection and indexing (W)
**Purpose:** choose repositories and watch the first index build.
**Elements:** searchable repo table (name, language, size, default branch, state selector
`Disabled / Observe / Active`), bulk actions, index progress bar per repo with stage label
(`cloning → parsing → symbol index → embeddings`), size/limit warnings.
**Actions:** set state, start/cancel index, "Run a trial review" (→ S03 flow), skip for now.
**Validation:** repos over the working-tree limit can be enabled but display a "diff-scoped
retrieval only" badge (`FR-003`).
**Loading:** table skeleton; per-row progress.
**Empty:** "No repositories were shared with the app" + link to adjust the installation.
**Error:** index failure shows the failing stage and a retry; repeated failure offers
diff-scoped mode.
**Offline:** state changes queue locally and are shown as "pending sync"; index actions disabled.
**Accessibility:** progress bars expose `aria-valuenow` and a text equivalent.
**Analytics:** `repo_state_changed{from,to}`, `index_completed{duration,files}`, `index_failed{stage}`.

## S03 — Guided first review (W)
**Purpose:** show value before Quorum can embarrass anyone.
**Elements:** picker of recent merged PRs, live run timeline (the same component as S06),
resulting findings rendered exactly as they would appear on the PR, side-by-side "what would
have been posted (budget 8)" vs "what stayed in the dashboard".
**Actions:** run, change budget and re-rank (no re-run), switch repo to Active, invite team.
**Validation:** trial runs are `observe`-locked; the publish path is disabled at the API level,
not just in the UI.
**Loading:** streaming node timeline with per-lane status.
**Empty:** no merged PRs in the last 90 days → offer paste-a-diff instead.
**Error:** run failure shows the failed node and offers resume-from-checkpoint.
**Offline:** cannot start; existing trial result remains readable.
**Analytics:** `trial_run_started`, `trial_run_completed{findings,posted_equivalent}`, `activated{repo_id}`.

## S04 — Reviews inbox (W) — *primary screen*
**Purpose:** every run across the org at a glance.
**Elements:** filter bar (repo, state, verdict, severity present, author, date, cost, lane
failures), virtualised table (PR title/number, repo, verdict chip, posted/held counts,
duration, credits, run state), saved views, bulk re-run, live-updating rows.
**Actions:** open run (S05), re-run, cancel, open PR in the Git host, export CSV.
**Validation:** filters serialise into the URL; exports capped at 10k rows with async email
delivery beyond that.
**Loading:** 10 skeleton rows; filters remain interactive.
**Empty:** distinguishes *no repos active* (→ S02), *no PRs yet* (waiting-state illustration),
and *filters exclude everything* (→ clear filters).
**Error:** partial failure renders rows that loaded plus an inline retry for the failed page.
**Offline:** cached page with "as of" stamp; re-run/cancel disabled.
**Permissions:** members see repos they can read on the Git host; the repo list is intersected
with host permissions on every request.
**Accessibility:** table has a caption, sortable headers are buttons with `aria-sort`, row
activation works on Enter.
**Analytics:** `inbox_viewed`, `inbox_filtered{facets}`, `run_reopened`.

## S05 — Review detail (W) — *primary screen*
**Purpose:** understand and act on one run.
**Layout:** three panes — left: finding list grouped by `Posted` / `Held (below budget)` /
`Suppressed` / `Refuted`; centre: diff viewer anchored to the selected finding; right:
evidence and verdict panel.
**Elements:** header (PR link, head SHA, policy version, pipeline version, routing mode, duration,
credits, lanes run with failures called out), verdict banner, per-finding cards (severity, category,
title, calibrated confidence, evidence-class chips), summary-comment preview.
**Actions:** post a held finding manually (policy-permitting), dismiss with reason, mark
false positive, create a suppression, open trace (S06), re-run, copy permalink.
**Validation:** dismissal requires a reason from a fixed list plus optional free text; manual
posting is blocked if the line no longer exists at head.
**Loading:** finding list streams as verification completes; the diff pane loads independently.
**Empty:** "No findings — here is what was checked" listing lanes, files reviewed and skimmed,
so silence is legible rather than suspicious.
**Error:** if the diff cannot be fetched, findings still render with excerpt-only context and
a banner.
**Offline:** read-only from cache; all mutations disabled.
**Permissions:** `member` may read and dismiss; `maintainer` may suppress and post held
findings; `owner` may change policy from here.
**Accessibility:** the three panes are landmarks; finding list is a listbox with roving focus;
the diff viewer is keyboard-navigable line by line and exposes line numbers to screen readers.
**Analytics:** `review_opened`, `finding_expanded{class}`, `evidence_opened`, `finding_dismissed{reason}`, `held_finding_posted`.

## S06 — Run trace / graph inspector (W)
**Purpose:** make the pipeline inspectable (`FR-050`).
**Elements:** LangGraph node timeline (node name, status, start/end, duration, model, **routed
tier and route reason**, **escalation marker with its trigger and the model escalated from**,
prompt version, tokens in/out, cost), a collapsible graph map showing the executed path including
`Send` fan-outs, per-node input/output JSON with secrets redacted, tool-call log, retrieved-context
list with file:line spans, checkpoint markers.
**Actions:** expand node, copy node payload, replay from checkpoint (P1, sandboxed), download
trace JSON, jump to the finding a node produced.
**Validation:** payloads over 256 KB are truncated with a download link; redaction is applied
server-side before the payload leaves the API.
**Loading:** timeline streams live during an in-flight run.
**Empty:** trace expired (past retention) → explains retention and offers re-run.
**Error:** trace store unavailable → run summary still renders.
**Offline:** cached traces readable.
**Permissions:** `maintainer`+ (traces can contain code excerpts).
**Accessibility:** the timeline is a list, not a canvas; the graph map has an equivalent
text outline toggle.
**Analytics:** `trace_opened`, `node_expanded{node}`, `trace_downloaded`.

## S07 — Repository settings (W)
**Sections:** State & scope (state, branch filters, path include/exclude, draft handling,
bot-author handling) · Lanes (enable/disable, per-lane severity ceiling) · Budget & ranking
(comment budget, minimum severity to post, style advisory toggle) · Policy (check-run
conclusion, may-request-changes, may-approve, auto-fix) · Analyzers (linter/SAST selection,
custom command allowlist) · Rules (→ S08) · Language & tone.
**Elements:** effective-config viewer showing value + source layer (`default` / `org` / `.quorum.yaml`
/ `repo UI`), YAML preview, "copy as .quorum.yaml".
**Actions:** edit, save, revert to org default, validate file, view change history.
**Validation:** budget 1–25; policy escalations (approve, auto-fix, blocking) require a typed
confirmation; conflicting path globs are reported before save.
**Loading:** form skeleton, save button disabled until config loads.
**Empty:** not applicable (always has defaults).
**Error:** invalid `.quorum.yaml` is surfaced with line/column and the last-known-good in use.
**Offline:** read-only.
**Permissions:** `maintainer` for most, `owner` for policy escalations.
**Accessibility:** grouped fieldsets with legends; every control has a persistent description,
not a tooltip-only explanation.
**Analytics:** `settings_saved{section}`, `policy_escalated{setting}`.

## S08 — Rules editor (W, P1)
**Purpose:** natural-language conventions that are actually testable (`FR-025`, `FR-030`).
**Elements:** rule list (name, scope globs, severity, status, hit rate, false-positive rate),
editor with rule text, scope, severity, and a **rule spec** panel holding "should flag" and
"should not flag" code samples; a Test button that runs the rule against the samples and
against the last 20 merged PRs.
**Actions:** create, edit, test, enable/disable, delete, import from a dismissed finding.
**Validation:** a rule cannot be enabled until its spec passes; rules with >30% dismissal rate
over 20 firings are auto-flagged for review.
**Loading:** test run streams results per sample.
**Empty:** starter templates plus "generate rules from this repo's past review comments" (P2).
**Error:** ambiguous rule → the compiler returns the ambiguity and a suggested rewrite.
**Offline:** read-only.
**Analytics:** `rule_created`, `rule_spec_failed`, `rule_disabled_auto{reason}`.

## S09 — Learnings (W, P1)
**Purpose:** show and control what Quorum has inferred (`FR-061`).
**Elements:** learning cards (statement, scope, origin finding, created date, suppression count,
last used), filters, per-learning audit trail.
**Actions:** edit statement, narrow/broaden scope, disable, delete, promote repo→org.
**Validation:** learnings that would suppress `high`/`critical` security findings require typed
confirmation and are marked with a warning badge.
**Empty:** explains that learnings appear after dismissals with reasons.
**Error/Offline/Permissions:** standard; `maintainer`+ to modify.
**Analytics:** `learning_edited`, `learning_deleted`, `learning_scope_promoted`.

## S10 — Analytics (W, P1)
**Elements:** acceptance rate over time (the precision proxy), comments per PR, time-to-first-comment
percentiles, per-lane yield and dismissal rate, spend vs cap, top suppressed rules, repo leaderboard
by acceptance (never by author).
**Actions:** change range, filter by repo/lane, export CSV, set an alert threshold.
**Validation:** ranges under 20 runs display a "not enough data" state instead of a misleading chart.
**Loading:** chart skeletons with axis reserved.
**Empty:** "No completed runs in this range."
**Error:** per-chart failure isolated.
**Offline:** cached.
**Accessibility:** every chart has a data-table toggle; series distinguished by shape and label,
not colour alone.
**Analytics:** `analytics_viewed{range}`, `analytics_exported`.

## S11 — Organisation and members (W)
**Elements:** member table (name, email, role, last active, linked Git identity), invitations,
role editor, SSO/SCIM settings (plan-gated), default policy for new repos.
**Actions:** invite, change role, remove, resend invite, configure SSO.
**Validation:** the last `owner` cannot be demoted or removed; role changes are audit-logged.
**States:** standard; SSO-locked orgs disable manual invites with an explanation.
**Permissions:** `owner`.
**Analytics:** `member_invited`, `role_changed{from,to}`.

## S12 — Models, providers and routing (W)
**Elements:** per node-class rows (`triage`, `lane`, `verify`, `summarise`, `embed`) with provider,
model, **tier** (1 cheap / 2 mid / 3 strong), **role** (`primary`, `escalation`, `fallback`,
`floor`), base URL, max tokens, temperature; credential fields (write-only, masked);
"Test connection"; cost preview per class; a warning if `verify` uses the same model as `lane`.
**Routing panel:** mode selector (`Static` / `Adaptive` / `Shadow — log only`), escalation-trigger
toggles with a one-line explanation each, per-run escalation budget (0–10), maximum tier, and a
live report: tier share, escalation rate, escalation yield, and realised savings versus an
all-strong baseline, with a "this period vs last" comparison.
**Actions:** save, test, rotate credential, reset to defaults, run the routing policy in shadow,
promote a shadow policy, revert to the previous policy.
**Validation:** a connection test must pass before a provider is saved as primary; changing the
verify model invalidates calibration and says so; `verify` cannot be assigned a tier below its
floor; adaptive mode cannot be enabled without at least one `escalation` row; promoting a shadow
policy is blocked until it has covered at least 50 runs, and the dialog shows the precision and
cost deltas it is being promoted on.
**Error:** test failure shows the provider's status code and a redacted response snippet.
**Permissions:** `owner`.
**Empty:** no escalation rows yet → routing panel explains adaptive mode and offers the default
tier assignment as a starting point.
**Error:** an escalation model that fails its connection test disables adaptive mode rather than
silently falling back, and says so.
**Accessibility:** tier is a labelled select, never a colour-coded badge alone; the savings figure
has a text description beside the chart.
**Analytics:** `provider_configured{class,provider}`, `provider_test_failed{code}`,
`routing_mode_changed{from,to}`, `routing_policy_promoted{precision_delta,cost_delta}`.

## S13 — Billing and plans (W)
**Elements:** current plan, seat count, credits used vs cap with projection, invoice history,
payment method, cap editor, overage policy (`degrade to observe` / `notify only`), upgrade path.
**Actions:** change plan, update payment method, set cap, download invoice, start self-host trial.
**Validation:** lowering the cap below current usage warns that runs will degrade immediately.
**States:** past-due → persistent banner and a 7-day grace before degradation; canceled → data
retained per retention policy with a countdown.
**Permissions:** `owner`.
**Analytics:** `plan_changed{from,to}`, `cap_changed`, `budget_threshold_hit{pct}`.

## S14 — Audit log (W)
**Elements:** filterable, immutable event table (actor, action, target, ip, timestamp,
correlation id); export.
**Actions:** filter, export NDJSON, stream to SIEM (plan-gated).
**Validation:** read-only; no delete path exists in the product.
**Permissions:** `owner`, plus a read-only `auditor` role.
**Analytics:** `audit_exported`.

## S15 — Data and privacy (W)
**Elements:** retention controls (traces, evidence excerpts, findings), excerpt-persistence
toggle, sub-processor list, export request, deletion request with typed confirmation, DPA download.
**Actions:** request export, request deletion, change retention, download records.
**Validation:** deletion requires typed org name and re-authentication; a 24-hour cancellation
window is shown before execution.
**States:** export pending → progress and email-on-ready; deletion scheduled → countdown banner
across the whole app.
**Permissions:** `owner`.
**Analytics:** `export_requested`, `deletion_requested`, `deletion_canceled`.

## S16 — System health (W, self-hosted and internal)
**Elements:** queue depth, active runs, runner pool status, provider latency/error rates,
checkpointer lag, webhook replay backlog, version banner.
**Actions:** drain queue, cancel a stuck run, replay webhooks, rotate a runner.
**Permissions:** `owner` on self-hosted; internal operators on cloud.
**Empty/Error/Offline:** metrics gaps are drawn as gaps, never interpolated.

## S17 — Account (W)
Profile, linked Git identity, notification preferences (per-repo digest, critical-only, off),
sessions with revoke, personal API tokens with scopes and expiry, theme.
**Validation:** token creation shows the secret exactly once; expiry required, max 365 days.

---

# In-Git-host surfaces (G) — *the surfaces that actually decide adoption*

## G01 — Summary comment
One comment per PR, edited in place (`FR-041`). Structure:
1. One-line verdict ("2 issues worth your attention · 6 held · 1 lane degraded").
2. Table of posted findings: severity, file:line, one-line claim.
3. `<details>` blocks: what was checked (lanes, files deeply reviewed vs skimmed), held findings
   count with dashboard link, suppressed count, run cost and duration.
4. Footer: AI disclosure, run permalink, command help.
**States:** *in progress* (posted within 10s: "Reviewing… deterministic checks done, lanes
running"), *complete*, *degraded* (names failed lanes), *skipped* (states the triage reason),
*budget exhausted*, *error* (correlation id + retry command).

## G02 — Inline review comments
Posted as one review. Each comment: severity chip, one-sentence claim, why it matters, evidence
citation, optional `suggestion` block, and `Dismiss` / `Explain` command hints. Never more than
the budget. Re-anchored on re-run; withdrawn (minimised with a note) when resolved.

## G03 — Check run `quorum/review`
`in_progress` immediately, then `completed` with a policy-driven conclusion and a summary
mirroring G01. Provides "Details" deep-link into S05.

## G04 — Command replies
Threaded replies to `@quorum …` commands, acknowledged within 15s. Unknown command → one help
reply per thread, never repeated.

---

# CLI (C)

## C01 — `quorum review`
`quorum review --pr 123` / `--diff patch.diff` / `--range main...HEAD`.
Streams node progress to stderr, prints findings to stdout (`--format text|json|sarif`).
Exit codes: `0` no blocking findings, `1` blocking findings, `2` run error, `3` configuration error.
**Offline:** with a local model endpoint configured, runs fully offline; otherwise fails fast
with a clear message. Deterministic analyzers always run locally.
**Empty:** "No findings" plus the same what-was-checked block.
**Accessibility:** honours `NO_COLOR`, no reliance on colour for severity, machine-readable output.

## C02 — `quorum config` / `quorum login` / `quorum trace <run_id>`
Validate and print effective config, authenticate a device-code login, and pull a trace for
local inspection.
