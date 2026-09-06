# 00 Reference Analysis

**New product:** Quorum
**Reference:** the AI pull-request review category, analysed as a set rather than a single
app, because the user's brief named a product *type* ("Autonomous Code Review Pipeline")
rather than a specific product. The reference set is the four systems that define current
expectations: **CodeRabbit**, **Greptile**, **GitHub Copilot code review**, and
**Qodo Merge / PR-Agent** (open source).
**Research date:** 2026-09-06
**Method:** official documentation and changelogs first, then vendor blogs, then
third-party benchmarks and review round-ups. See `SOURCES.md`.

Every statement below is tagged **Verified** (supported by a cited source or public
documentation), **Strongly inferred** (implied by observable behaviour or platform
constraints, not publicly confirmed), or **Proposed** (a design decision for Quorum, not a
claim about any reference product).

---

## 1. Reference overview

| Product | Shape | Distribution | Notes |
|---|---|---|---|
| CodeRabbit | Hosted app + IDE extension + CLI | GitHub, GitLab, Azure DevOps, Bitbucket | Broadest Git-host coverage of the set (Verified) |
| Greptile | Hosted app | GitHub, GitLab | Repo-graph indexing, multi-agent "swarm" framing (Verified per vendor/press) |
| GitHub Copilot code review | First-party feature of GitHub | GitHub (and Azure Repos) | Deepest platform integration; can approve PRs behind an off-by-default setting (Verified) |
| Qodo Merge / PR-Agent | Managed app **and** self-hostable OSS | GitHub, GitLab, Bitbucket, Azure DevOps | Command-driven (`/review`, `/improve`, `/ask`) (Verified) |

### Target users
Software engineers, tech leads, and platform/DevEx teams at teams of ~5–500 engineers;
secondarily open-source maintainers drowning in contributor PRs. (Strongly inferred from
pricing pages that are priced per developer seat and marketed at engineering teams.)

### Business models observed
- Per-developer seat subscription with a free tier (CodeRabbit: free tier; Pro ≈ $24/dev/mo
  annual, $30 monthly; Pro+ ≈ $48/dev/mo annual) — Verified via pricing round-ups, 2026-09-06.
- Seat + usage hybrid (Greptile: ≈$30/seat/month including a bundle of reviews, then
  per-review overage; the mid-2026 shift to per-review pricing drew public backlash) — Verified.
- Bundled into an existing subscription with metered consumption (Copilot code review
  consumes a premium request per review; from 2026-06-01 private-repo reviews additionally
  consume GitHub Actions minutes) — Verified.
- Open-source core with a commercial managed tier (Qodo Merge / PR-Agent) — Verified.

---

## 2. Feature inventory

| # | Capability | Class | Present in |
|---|---|---|---|
| F1 | Automatic review on PR open/synchronize | Verified | All four |
| F2 | Plain-language PR walkthrough / summary comment | Verified | CodeRabbit, Qodo Merge, Copilot |
| F3 | Line-level inline comments on the diff | Verified | All four |
| F4 | Committable / one-click fix suggestions | Verified | CodeRabbit, Copilot, Qodo Merge |
| F5 | Diagrams of change flow (e.g. sequence diagrams in the summary) | Verified | CodeRabbit |
| F6 | Whole-repository context beyond the diff (code graph / index) | Verified | Greptile; claimed by others |
| F7 | Multiple specialised agents/perspectives per PR | Verified (vendor claims) | Greptile "swarm", Qodo 2.0 multi-agent |
| F8 | Chat / slash commands on the PR (`@bot`, `/review`, `/improve`, `/ask`) | Verified | CodeRabbit, Qodo Merge |
| F9 | Integrated linters / SAST alongside the LLM | Verified | CodeRabbit (40+ linters on paid tier) |
| F10 | Team-specific rules in natural language | Verified | Greptile, CodeRabbit (custom instructions) |
| F11 | Learning from past review feedback | Verified (vendor claims) | Greptile, CodeRabbit |
| F12 | Repository question-answering | Verified | Greptile |
| F13 | Unit-test generation / coverage gap detection | Verified | CodeRabbit Pro+, Qodo Merge |
| F14 | Reviewing bot-authored and very large PRs | Verified (2026-08-27 changelog) | Copilot code review |
| F15 | Bot can formally approve a PR (off by default, org-configurable) | Verified (2026-09-01 changelog) | Copilot code review |
| F16 | Resolution reasons captured when a comment is dismissed | Verified (2026-08-27 changelog) | Copilot code review |
| F17 | Request a review from the terminal (`gh pr create/edit`) | Verified (2026-03-11 changelog) | Copilot code review |
| F18 | IDE and CLI review surfaces outside the PR | Verified | CodeRabbit |
| F19 | Self-hosting / bring-your-own-infrastructure | Verified | Qodo Merge / PR-Agent (OSS) |
| F20 | Analytics dashboard over review activity | Verified | CodeRabbit |
| F21 | Issue-tracker linkage (Jira, Linear) | Verified | CodeRabbit |
| F22 | Reviews complete in tens of seconds to a few minutes | Verified | Copilot documents "usually under 30 seconds" |
| F23 | Per-file/path filters and per-path instructions | Strongly inferred | Configuration files exist in the category; exact schema varies |
| F24 | Async job execution after the webhook returns | Strongly inferred | Implied by review latency exceeding webhook timeouts |
| F25 | Repository content indexed and cached server-side between runs | Strongly inferred | Implied by "full-repo context" latency claims |
| F26 | Per-finding provenance/evidence trail exposed to the user | Strongly inferred / partial | A 2026 CodeRabbit "source line" feature is reported; not a category norm |
| F27 | Adversarial verification of each finding before posting | Proposed | Quorum's differentiator |
| F28 | Hard per-PR comment budget with calibrated ranking | Proposed | Quorum |
| F29 | Replayable agent-run trace exposed to the customer | Proposed | Quorum |
| F30 | Rules that ship with their own test cases ("rule specs") | Proposed | Quorum |

---

## 3. Screen and surface map

### In the pull request (Verified for the category)
1. Summary/walkthrough comment posted by the bot.
2. Inline review comments anchored to diff lines, some with suggested patches.
3. A status/check entry reporting pass/attention.
4. Threaded replies to the bot, including commands.

### Web application (Verified in outline, per-screen detail Strongly inferred)
1. Install / connect the Git provider.
2. Repository list and enablement.
3. Configuration (rules, path filters, review depth).
4. Analytics or activity dashboard.
5. Organisation, members, and billing.

### Other surfaces
- IDE extensions and a CLI (Verified, CodeRabbit).
- Chat-tool integrations (Verified, CodeRabbit: Slack/Discord).

---

## 4. Evidence ledger

| Capability | Observation | Evidence | Date | Confidence | Class | Quorum decision |
|---|---|---|---|---|---|---|
| Auto-review on PR events | Review runs on open and on each push | Vendor docs and product pages across the set | 2026-09-06 | High | Verified | MVP |
| Four-platform Git support | CodeRabbit supports GitHub, GitLab, Azure DevOps, Bitbucket | CodeRabbit docs | 2026-09-06 | High | Verified | GitHub MVP, GitLab P1, others P2 |
| Bot approval of PRs | Copilot can approve; off by default, org/repo configurable | GitHub changelog 2026-09-01 | 2026-09-06 | High | Verified | P1, off by default, policy-gated |
| Resolution reasons on dismissal | Copilot captures why a comment was resolved | GitHub changelog 2026-08-27 | 2026-09-06 | High | Verified | MVP — it is the calibration signal |
| Large / bot-authored PR support | Copilot extended to very large and bot-authored PRs | GitHub changelog 2026-08-27 | 2026-09-06 | High | Verified | MVP with chunking strategy |
| Sub-30s review latency norm | Copilot documents typical sub-30-second reviews | GitHub docs | 2026-09-06 | High | Verified | Latency budget: p50 ≤ 90s to first comment, deterministic lane ≤ 30s |
| Multi-agent decomposition | Greptile v4 "swarm agents"; Qodo 2.0 multi-agent | Vendor announcement, press | 2026-09-06 | Medium-High | Verified (as vendor claim) | Adopt; implement as LangGraph lanes |
| Precision is the differentiator | Independent 2026 benchmarks rank tools by precision/recall/F1 over large real-PR corpora | Benchmark write-ups (CodeAnt, Entelligence, Martian-derived reporting) | 2026-09-06 | Medium | Verified as published, methodology not independently reproduced here | Publish our own eval numbers with an open method |
| Style-noise dominance | Reported that a majority of AI review comments are style noise and a minority catch real bugs | Third-party analysis | 2026-09-06 | Medium | Verified as published claim | Style lane is advisory-only and never consumes comment budget |
| Per-review usage pricing risk | Greptile's switch to per-review overage caused public backlash | Community reporting, 2026 | 2026-09-06 | Medium | Verified as reported | Price predictably; cap overage and never silently exceed |
| Server-side repo index | Reviews use repo-wide context faster than a cold clone allows | Latency behaviour | 2026-09-06 | Medium | Strongly inferred | Build an explicit, invalidatable index with documented retention |
| Async execution | Review posts minutes after the webhook | Observable | 2026-09-06 | High | Strongly inferred | Queue + durable graph |
| Prompt/model internals of references | Not public | — | — | — | Not knowable | Design our own; no attempt to replicate |
| Adversarial verify stage | Not observed as a named product feature in the set | — | — | — | Proposed | Core of Quorum |
| Comment budget | Not observed as an enforced hard cap | — | — | — | Proposed | Core of Quorum |
| Rule specs (rules with tests) | Not observed | — | — | — | Proposed | P1 |

---

## 5. Strengths of the reference category

- **Zero-friction distribution.** A Git app install is the entire onboarding, and reviews
  appear where the work already happens.
- **Real latency.** Sub-minute feedback is now normal, which puts review inside the
  author's working memory window.
- **Whole-repo context.** Indexing beats diff-only review on cross-file defects.
- **Deterministic tools plus LLM.** Pairing linters/SAST with model reasoning gives a
  floor of correctness the model alone cannot provide.
- **Configurability in plain English.** Teams encode conventions without writing plugins.
- **Feedback capture.** Resolution reasons and learned preferences create a closed loop.

## 6. Weaknesses and gaps

| Weakness | Consequence | Quorum's answer |
|---|---|---|
| False positives are the number-one complaint across the category | Teams mute the bot; the tool becomes shelfware | Evidence gating + adversarial verification + hard comment budget (`FR-030`, `FR-031`, `FR-032`) |
| Style noise crowds out defects | Real bugs are buried below nits | Style findings are advisory-only, collapsed, never budgeted |
| Opaque reasoning | A dismissed comment teaches nobody anything | Replayable run trace and per-finding evidence (`FR-050`) |
| Feedback loops are implicit | Users cannot see or edit what the bot "learned" | Learnings are first-class records users can read, edit, and delete (`FR-060`) |
| Unpredictable usage pricing | Budget shock and public backlash | Hard-capped credits, pre-spend warnings, never-silent overage (`FR-070`) |
| Source code leaves the customer boundary | Blocks regulated and security-sensitive buyers | Self-hosted container, BYO model endpoint, no-retention default (`FR-080`) |
| Very large PRs degrade quality | Reviews get shallower where risk is highest | Explicit chunking + risk-ranked attention budget rather than truncation |
| Non-determinism between runs | The same PR reviewed twice says different things | Checkpointed runs, cached lane results keyed by diff hash, deterministic ranking |
| No shared vocabulary for severity | Teams cannot set policy | Fixed severity taxonomy + policy engine (`FR-040`) |

## 7. Opportunities Quorum takes

1. **Precision as the marketed metric**, with a published, reproducible eval harness.
2. **The verifier as a product surface** — users can see the refutation attempt that failed.
3. **Policy over opinion** — blocking, approving, and auto-fixing are policy decisions with
   an audit trail and human-in-the-loop gates, not model whims.
4. **Bring-your-own-everything** — model provider, cloud, and index storage.
5. **Rules with tests**, so a team's convention is enforceable and regression-checked.
6. **Cost transparency per PR**, shown before and after the run.

## 8. Originality boundaries

- No reference product's name, mascot, wordmark, colour system, comment formatting, or
  copy is reused. "Quorum" is an original working title chosen for the consensus/verification
  concept.
- No proprietary prompts, datasets, model weights, or source code from any reference product
  are copied; none were accessed.
- Only independently implementable product concepts are carried over: reviewing on PR
  events, summary plus inline comments, repo-wide retrieval, natural-language rules, chat
  commands, and analytics. These are category conventions, not protected expression.
- Public benchmark numbers are cited as third-party claims with dates, never restated as
  measurements taken by this project.
