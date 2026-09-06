# 03 User Flows — Quorum

Mermaid diagrams below are the authoritative flow definitions. Screen ids refer to
`02_UX_SCREEN_SPEC.md`; requirement ids to `01_PRD.md`.

---

## 1. First run / onboarding (org admin)

```mermaid
flowchart TD
    A[Sign up with Git identity] --> B[S01 Connect provider]
    B -->|Install app, select repos| C{Callback valid?}
    C -->|No| C1[Error: state mismatch, restart install] --> B
    C -->|Yes, but scopes missing| C2[Show missing scope + re-authorise] --> B
    C -->|Yes| D[S02 Repo selection - all repos default to Observe]
    D --> E[Index build per repo]
    E -->|Too large| E1[Diff-scoped mode badge] --> F
    E -->|Failed| E2[Retry / fall back to diff-scoped] --> F
    E -->|Done| F[S03 Guided first review on a recent merged PR]
    F --> G[Show would-have-posted vs held]
    G --> H{Happy?}
    H -->|No| I[Tune budget/lanes in S07, re-rank without re-running]
    I --> G
    H -->|Yes| J[Switch repo to Active]
    J --> K[Invite team + set org default policy]
```

**Exit criterion:** at least one repo in `Active` and one real PR reviewed.
**Recovery:** abandoning at any step leaves the org in a safe state — nothing posts until a repo
is explicitly Active (`FR-002`).

---

## 2. Primary happy path — a pull request is reviewed

```mermaid
sequenceDiagram
    participant Dev as Author
    participant GH as Git host
    participant IN as Ingress (FastAPI)
    participant LG as LangGraph run
    participant SB as Sandbox runner
    participant PR as PR surfaces

    Dev->>GH: push / open PR
    GH->>IN: webhook pull_request.opened
    IN->>IN: verify signature, persist event, dedupe key
    IN-->>GH: 202 (<500ms)
    IN->>LG: create run (thread_id = run key)
    LG->>PR: check run in_progress + "Reviewing…" summary (<10s)
    LG->>SB: checkout head, run linters/type/SAST/secrets
    SB-->>LG: deterministic findings + CI signals
    LG->>LG: triage gate -> full
    LG->>LG: retrieval subgraph (symbols, callers, tests, blame)
    par lanes (Send fan-out)
        LG->>LG: correctness
        LG->>LG: security
        LG->>LG: api_contract
        LG->>LG: tests
    end
    LG->>LG: dedupe + merge candidates
    par verify (Send per finding)
        LG->>LG: adversarial verifier (fresh context, must fetch code)
    end
    LG->>LG: calibrate, rank, apply budget + suppressions
    LG->>LG: policy decision
    LG->>PR: one review with N inline comments + updated summary + check run completed
    LG->>SB: destroy checkout
    Dev->>PR: reads comments, fixes, pushes
    GH->>IN: pull_request.synchronize -> supersede + reconcile
```

---

## 3. Author responds — dismiss, explain, re-review

```mermaid
flowchart LR
    A[Comment posted] --> B{Author action}
    B -->|Applies suggestion| C[Push -> new run -> finding resolved, comment minimised]
    B -->|"@quorum explain 4f2"| D[Reply with evidence, verifier attempt, retrieval citations]
    B -->|"@quorum dismiss 4f2 not-a-bug"| E[Record feedback FR-060]
    B -->|Resolves with reason in UI| E
    B -->|Ignores| F[No action; counted as unresolved in analytics]
    E --> G{Reason = wrong / not-our-convention?}
    G -->|Yes| H[Create suppression fingerprint FR-034]
    H --> I[P1: propose a Learning for maintainer approval S09]
    G -->|No| J[Feedback only - feeds calibration FR-033]
```

**Failure path:** if posting the reply fails (rate limit, permission revoked), the feedback is
still recorded and the reply is retried with backoff for up to 1 hour, then dropped with an
entry in the run's error log and a dashboard notice.

---

## 4. Auto-fix with human-in-the-loop (`FR-045`, P1)

```mermaid
flowchart TD
    A[Verified finding with a mechanical fix] --> B[Fix subgraph drafts patch]
    B --> C[Apply patch in sandbox]
    C --> D{Patch applies + build/tests pass?}
    D -->|No| E[Downgrade to comment without suggestion] --> Z[End]
    D -->|Yes| F[LangGraph interrupt: approval required]
    F --> G[Maintainer sees the diff in S05 and on the PR]
    G -->|Approve| H[Command resume -> open fix branch + PR, link to origin PR]
    G -->|Reject with reason| I[Command resume -> record reason, no write]
    G -->|Timeout 72h| J[Auto-expire, run completes, logged]
    H --> K[Audit log entry + notification]
```

Nothing is written to the repository without an explicit human decision recorded against a user
id. The graph is genuinely paused (state persisted at the checkpoint), so an approval days later
resumes the same run rather than starting a new one.

---

## 5. Authentication and session

```mermaid
flowchart TD
    A[Visit app] --> B{Session cookie valid?}
    B -->|Yes| C[Dashboard]
    B -->|No| D{Org enforces SSO?}
    D -->|Yes| E[Redirect to IdP SAML/OIDC] --> F[Assert -> provision/link user via SCIM or JIT] --> C
    D -->|No| G[OAuth with Git host] --> H[Link Git identity, sync org membership] --> C
    C --> I{Action requires elevation?}
    I -->|Policy escalation, deletion, credential change| J[Re-authenticate step-up] --> K[Proceed + audit]
    I -->|No| K
```

Sessions: 12h idle / 30d absolute, rotating refresh, revocable per device from S17.
CLI uses device-code flow issuing a scoped token with a required expiry.

---

## 6. Purchase and plan change

```mermaid
flowchart TD
    A[Free plan, 1 repo Active] --> B{Hits a gate: seats, lanes, budget, self-host}
    B --> C[S13 Plans with the blocking gate highlighted]
    C --> D[Stripe Checkout]
    D -->|Success webhook| E[Entitlements updated server-side from Stripe as source of truth]
    D -->|Abandoned| F[Return with a saved intent, no state change]
    E --> G[Immediate feature unlock + confirmation email]
    G --> H{Payment later fails?}
    H -->|Yes| I[Past-due banner, 7-day grace] --> J{Resolved?}
    J -->|No| K[Degrade to Observe - never silently stop reviewing without saying so]
    J -->|Yes| G
```

Cancellation keeps data for the retention window with a visible countdown; downgrade never
deletes findings, it only disables features.

---

## 7. Budget and cost guardrail

```mermaid
flowchart LR
    A[Run requested] --> B{Org credits remaining?}
    B -->|>20%| C[Run full]
    B -->|<20%| D[Run full + notify owner at 80% consumed]
    B -->|0| E{Overage policy}
    E -->|Degrade| F[Run in Observe: analyse, do not post; summary explains why]
    E -->|Notify only| G[Run full, bill overage, alert owner]
    C --> H{Per-run token ceiling hit?}
    H -->|Yes| I[Abort remaining lanes, publish what was verified, mark run partial]
```

---

## 8. Failure and recovery paths

| Failure | Detection | Behaviour | User-visible |
|---|---|---|---|
| Webhook delivery lost | Git host redelivery + 7-day event log | Replay from persisted event | None |
| Worker crash mid-run | Checkpointer heartbeat / lease expiry | Resume from last checkpoint; at most one node re-executed (`NFR-04`) | Run duration extends; timeline shows a resume marker |
| Model provider 5xx / timeout | Per-call timeout + retries with jitter | Retry ×2, then fall back to secondary provider, then degrade that lane | Summary lists the degraded lane |
| Model returns invalid JSON | Schema validation | One repair retry, then lane degrades | Same as above |
| Sandbox timeout | Hard wall clock | Kill, keep deterministic results, mark analyzers partial | Summary states analyzers were partial |
| Git host rate limit (incl. secondary) | 403/429 + headers | Exponential backoff honouring `Retry-After`; queue posts; never re-post duplicates | Comments arrive late; check run stays `in_progress` |
| Comment post partially fails | Per-comment result check | Retry failed subset only; summary reconciled | Summary lists comments that could not be anchored |
| Index stale/corrupt | Checksum + version | Rebuild in background, run in diff-scoped mode meanwhile | Badge on repo |
| Postgres failover | Connection errors | Runs pause, queue holds; resume on recovery | Banner in S16 |
| Prompt-injection attempt detected in repo content | Injection classifier | Findings from the affected context quarantined, run flagged, maintainer notified | Warning in summary + S05 banner |
| Run stuck >30 min | Watchdog | Cancel, publish partial, alert | Run marked `timed_out` with resume option |

---

## 9. Data export and deletion

```mermaid
flowchart TD
    A[S15 request export] --> B[Async job assembles NDJSON: orgs, repos, runs, findings, evidence, traces, learnings, audit]
    B --> C[Signed URL, 72h expiry, emailed to requester]
    D[S15 request deletion] --> E[Typed org name + step-up auth]
    E --> F[24h cancellation window with app-wide banner]
    F -->|Canceled| G[No change, audit entry]
    F -->|Elapsed| H[Purge findings, runs, traces, evidence, learnings, indexes]
    H --> I[Revoke app installation + destroy provider tokens]
    I --> J[Anonymise billing records retained for tax/legal]
    J --> K[Completion email with a deletion certificate id, within 30 days]
```

---

## 10. Admin / moderation flows

- **Policy escalation:** enabling blocking checks, request-changes, approval, or auto-fix requires
  `owner`, a typed confirmation, and produces an audit entry plus an org-wide notification.
- **Emergency mute:** an `owner` can set the whole org to `observe` in one action from S16; it takes
  effect on in-flight runs at the publish node.
- **Runaway-rule containment:** a rule exceeding a 30% dismissal rate over 20 firings is auto-disabled
  and its author notified (`FR-025`).
- **Abuse containment:** a repo generating anomalous run volume (fork spam, PR churn) is rate-limited
  per installation, and the owner is told which repo tripped it.
