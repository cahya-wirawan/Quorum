# 12 Analytics and Observability — Quorum

## 1. Product analytics principles

Pseudonymous user ids (hashed, per-org salt), no code content, no PR titles or bodies, no file
paths in any analytics event — paths and code stay in the operational database under retention
policy, never in the analytics pipeline. Self-hosted installs send no product analytics unless the
operator opts in. There is **no per-author quality metric** anywhere in the schema (`01_PRD.md` N7).

## 2. Product events

| Event | Properties |
|---|---|
| `org_created` | plan, source |
| `provider_connected` | provider, repo_count |
| `repo_state_changed` | from, to, repo_hash |
| `index_completed` / `index_failed` | duration_ms, files, stage |
| `trial_run_completed` | findings, posted_equivalent, duration_ms |
| `run_started` / `run_completed` | mode, trigger, lanes, changed_lines_bucket, duration_ms, credits, state |
| `finding_posted` | severity, category, lane, evidence_classes, calibrated_confidence_bucket, routed_tier, escalated |
| `finding_held` | reason (`budget`, `severity_floor`, `heuristic_only`) |
| `finding_refuted` | lane, category |
| `finding_feedback` | signal, source, latency_from_post_ms |
| `comment_thread_replied` | command |
| `evidence_opened` | from (`dashboard`, `pr_link`) |
| `trace_opened` / `node_expanded` | node |
| `policy_escalated` | setting, from, to |
| `rule_created` / `rule_spec_failed` / `rule_auto_disabled` | reason |
| `learning_created` / `learning_deleted` | scope |
| `budget_threshold_hit` | pct |
| `routing_mode_changed` | from, to |
| `routing_policy_promoted` | precision_delta, cost_delta, runs_observed |
| `plan_changed` | from, to |
| `paywall_viewed` | gate |
| `export_requested` / `deletion_requested` | — |

**Never logged, in any pipeline:** source code, diffs, evidence excerpts, PR titles/bodies,
customer secrets, model credentials, Git tokens, raw prompts (operational payloads go to object
storage under retention, not to analytics), email addresses (hashed only), IP addresses (audit log
only, not analytics).

## 3. North-star and health metrics

| Metric | Definition | Target |
|---|---|---|
| **North star:** accepted findings per active developer per week | posted findings marked `fixed`/`useful_not_fixed` ÷ active devs | ≥1.5 |
| Posted-comment acceptance rate | accepted ÷ posted (rolling 30d) | ≥70% GA, ≥80% at 6 months |
| False-positive rate | `wrong` + `not_a_bug` ÷ posted | ≤15% |
| Comments per PR | median posted | 2–5 |
| Time to first comment | p50 / p95 | ≤90s / ≤5min |
| Verify refute rate | refuted ÷ candidates | 25–55% (outside this band, the lanes or the verifier are miscalibrated) |
| Held-finding promotion rate | held findings manually posted ÷ held | 3–10% (higher means the budget is too tight) |
| Repo mute rate | active→observe/disabled within 30d | <5% |
| Weekly active repos | repos with ≥1 run | growth |
| Cost per review | credits × unit cost | ≤$0.35 median, ≤$0.25 with adaptive routing |
| Escalation rate | escalated calls ÷ model calls | 8–25% (below, triggers are too tight; above, the primary tier is too weak) |
| Escalation yield | confirmed findings from escalated calls ÷ escalations | ≥30% |
| Routing savings | 1 − (actual cost ÷ all-strong baseline cost) | ≥25% |
| Calibration error (ECE) | over feedback labels | ≤0.08 |

## 4. Operational metrics

| Metric | Type | Alert |
|---|---|---|
| `quorum_webhook_ack_seconds` | histogram | p99 > 0.5s for 5 min → page |
| `quorum_queue_lag_seconds` | gauge | > 120s for 10 min → page |
| `quorum_runs_active` / `_by_state` | gauge | `awaiting_human` > 50 → ticket |
| `quorum_node_duration_seconds{node}` | histogram | lane p95 > 60s → ticket |
| `quorum_node_failures_total{node,reason}` | counter | >5% of runs in 15 min → page |
| `quorum_lane_degraded_ratio` | ratio | >10% for 30 min → page |
| `quorum_provider_latency_seconds{provider,model}` | histogram | p95 > 30s → ticket |
| `quorum_provider_errors_total{provider,code}` | counter | >2% for 10 min → page (triggers fallback) |
| `quorum_schema_repair_total{node}` | counter | spike → prompt regression suspicion |
| `quorum_route_tier_calls_total{node_class,tier}` | counter | tier-share drift >20% week over week → ticket |
| `quorum_route_escalations_total{node,trigger}` | counter | escalation rate >40% for 1h → page (primary tier likely misconfigured or degraded) |
| `quorum_route_escalation_yield` | ratio | <15% over 500 escalations → ticket (triggers miscalibrated) |
| `quorum_route_plan_reuse_ratio` | ratio | <0.9 on re-runs → ticket (determinism at risk) |
| `quorum_route_budget_exhausted_total` | counter | spike → escalation budget too small for the traffic |
| `quorum_checkpoint_write_seconds` | histogram | p95 > 1s → ticket |
| `quorum_githost_rate_limit_remaining` | gauge | <15% → throttle + ticket |
| `quorum_comment_post_failures_total{reason}` | counter | any `anchor_lost` spike → ticket |
| `quorum_sandbox_failures_total{reason}` | counter | >3% → page |
| `quorum_run_cost_usd` | histogram | p95 > 2× baseline → page (cost incident) |
| `quorum_tokens_total{node_class}` | counter | budget burn tracking |
| `quorum_deletion_jobs_overdue` | gauge | >0 → page (compliance) |

## 5. Logs and traces

- Structured JSON logs with `ts, level, msg, request_id, run_id, org_id, repo_id, node, attempt`.
  A redacting formatter strips secret-shaped strings; a CI check fails builds that log raw request
  bodies or model prompts.
- OpenTelemetry traces span ingress → queue → graph run → node → provider call → Git-host write,
  so a slow review can be attributed in one view. Sampling: 100% of failed and >2min runs, 10% of
  the rest, always 100% of `verify` spans for findings that were posted (they are the ones anyone
  will ever question).
- LangSmith export is available for prompt-level debugging, opt-in, off by default on self-hosted,
  and never enabled for orgs that disabled excerpt persistence.

## 6. Dashboards

1. **Fleet health** — queue lag, runs by state, node failure rates, provider errors, sandbox health.
2. **Quality** — acceptance rate, false-positive rate, refute rate, comments per PR, per-lane yield,
   calibration curves; sliced by lane, language, repo size.
3. **Latency and cost** — time-to-first-comment percentiles, node duration heatmap, cost per run,
   token burn, cache hit rate, tier share, escalation rate and yield, realised routing savings
   against the all-strong baseline.
4. **Business** — active repos, seats, credits consumed vs cap, conversion, churn, mute rate.
5. **Compliance** — retention job status, deletion queue age, export queue, audit volume.
6. **Release** — per-`pipeline_version` comparison of acceptance rate, refute rate, cost and latency;
   this is the gate for promoting a prompt or model change beyond 5% of runs.

## 7. Alert routing

S1 (data exposure, deletion overdue, mass mis-posting) pages immediately and notifies the security
lead. S2 (pipeline down, provider outage without fallback, cost anomaly, quality regression >10
points) pages on-call. S3/S4 open tickets. Every alert links to a runbook, and every runbook names
the metric that proves recovery. Customer-visible incidents post to the status page automatically
when an S1/S2 lasts more than 10 minutes.
