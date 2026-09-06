# 08 Safety, Privacy and Compliance — Quorum

This is product and compliance engineering guidance, not legal advice. Counsel must review the
DPA, sub-processor list, and any regulated-sector claims before they are published.

---

## 1. Data inventory

| Data | Category | Source | Where stored | Retention (default) | Sent to model providers |
|---|---|---|---|---|---|
| Repository source code | Customer confidential | Git host | Sandbox ephemeral volume only | Destroyed at run end | Yes — diff hunks and retrieved chunks only |
| Diff / patch content | Customer confidential | Git host | Memory + run object prefix | 30 days (trace retention) | Yes |
| Evidence excerpts | Customer confidential | Derived | Postgres, ≤40 lines, redacted | 90 days, or never if `persist_excerpts=false` | No (already generated) |
| PR metadata (title, body, labels) | Customer + personal (author identity) | Git host | Postgres | 365 days | Yes, sanitised |
| Git identities (login, email if public) | Personal | Git host / OAuth | Postgres | Life of account | No |
| Account data (name, email, role) | Personal | User | Postgres | Life of account + 30 days | No |
| Findings, verdicts, feedback | Derived | Quorum | Postgres | 365 days | No |
| Graph checkpoints | Mixed (may contain code) | Quorum | Checkpoint Postgres | 30 days (90 if awaiting human) | No |
| Node payload traces | Mixed | Quorum | Object storage | 30 days | No |
| Model credentials (BYO) | Secret | Customer | External secret store, envelope-encrypted | Until rotated/deleted | Used, never logged |
| Audit events | Personal (actor) | Quorum | Postgres | 730 days | No |
| Billing records | Personal + financial | Stripe | Stripe + Postgres references | Statutory period | No |
| Product analytics events | Pseudonymous | Quorum clients | Analytics store | 400 days | No |

**Never stored:** Git host access tokens beyond a run's lifetime (installation tokens are minted
per run and discarded), full repository copies, customer secrets found during scanning (only the
fact and location of a match), model provider raw prompts on self-hosted installs unless the
operator opts in.

## 2. Personal data and lawful basis

Quorum processes personal data of engineers (identity, review activity) as a **processor** on
behalf of the customer (controller), on the customer's legitimate-interest or contractual basis.
For its own account/billing data Quorum is a controller.
Data-subject requests received directly are forwarded to the customer contact within 5 business
days, and the tooling in `/v1/privacy/*` lets the customer fulfil access, export, rectification
and erasure without Quorum staff touching the data.

**Explicitly not built:** per-developer productivity or quality scoring, ranking engineers, or
exporting individual performance metrics (`01_PRD.md` N7). Analytics aggregate by repo and lane,
never by author, and the schema has no author dimension on quality metrics — this is a design
constraint, not a setting.

## 3. Retention and deletion

- Defaults and ranges are in `05_DATA_MODEL.md` §5; every value is org-configurable within the
  stated bounds, and lowering a value triggers a purge on the next nightly job.
- **Deletion** (`FR-083`): typed confirmation + step-up auth → 24-hour cancellation window →
  purge of findings, runs, traces, evidence, checkpoints, indexes, learnings, and object prefixes
  → revocation of the app installation → anonymisation of billing rows → completion email with a
  certificate id, all within 30 days.
- **Export**: NDJSON per entity plus a manifest, delivered as a signed URL valid 72 hours.
- Backups are encrypted and expire within 35 days; deletion requests are re-applied to any
  restored backup before it is returned to service.

## 4. Encryption and key management

TLS 1.3 in transit (HSTS, no downgrade); AES-256 at rest for Postgres, object storage, and
backups; envelope encryption with a per-org data key for model credentials and webhook secrets;
keys in cloud KMS or Vault with annual rotation and rotation-on-compromise runbooks; no secret
ever written to logs (redacting formatter, plus a CI check that fails on likely secret patterns
in log statements).

## 5. Sub-processors (cloud offering)

| Processor | Purpose | Data | Region |
|---|---|---|---|
| Cloud provider (compute, Postgres, object storage) | Hosting | All | Customer-selected region: US or EU |
| Anthropic (default model provider) | Model inference | Diff hunks, retrieved chunks, PR text | Provider region |
| Stripe | Billing | Billing contact, payment metadata | Global |
| Email provider | Transactional email | Email address | Global |
| Error/telemetry vendor | Diagnostics | Pseudonymous events, no code | Same region |

Customers on Business+ can pin a region and substitute the model provider with their own
endpoint, which removes Anthropic from their sub-processor chain entirely. The current list is
published, versioned, and changes are announced 30 days in advance with an objection window.

## 6. Self-hosted and air-gapped

The standalone deployment sends **nothing** outbound except (a) the configured model endpoint and
(b) an optional licence heartbeat that carries only a licence id, version, and seat count and can
be replaced by an offline licence file. Telemetry is opt-in and off by default. Air-gapped
installs run with a local model endpoint and the deterministic-only fallback described in
`07_AI_OR_AUTOMATION_PIPELINE.md` §12.

## 7. AI-specific safety

| Risk | Control |
|---|---|
| Fabricated findings | Adversarial verification + line-resolution enforcement + evidence classes (`FR-030`, `FR-031`) |
| Noise / alert fatigue | Comment budget, style demotion, calibration, per-rule auto-disable |
| Prompt injection from repo content | Structural separation, sanitisation, read-only tools, deterministic publication, injection classifier (`07` §10) |
| Data exfiltration through model output | Comment bodies are template-rendered and escaped; links restricted to an allowlist; no `@`-mentions of third parties |
| Model claims presented as certainty | Every comment states it is machine-generated, shows calibrated confidence, and links to evidence (`FR-053`) |
| Autonomous writes | No write without a recorded human approval; approval pauses the graph (`FR-045`) |
| Over-blocking CI | Blocking is off by default and requires an owner-level escalation with typed confirmation |
| Bias in learned suppressions | Learnings may only suppress or downrank, are visible and editable, and cannot silence `high`+ security findings without confirmation (`FR-062`) |
| Model/provider outage causing silent silence | Degraded lanes are named in the summary; a fully degraded run is reported as `partial`, never as "no issues" |
| Training on customer code | Contractually excluded with the default provider; the setting is documented and surfaced in the UI; BYO endpoint removes the question |

## 8. Content and abuse controls

Rate limits per installation and per repo; fork-spam and PR-churn detection with owner
notification; a hard cap on comments per PR and per hour; automatic pause of a repo that trips
anomaly thresholds; abuse-report path for OSS maintainers whose repos are targeted through the
free tier.

## 9. Platform and regulatory checklist

| Requirement | Applies | Status/approach |
|---|---|---|
| GitHub Marketplace listing requirements (app scopes justified, privacy policy, support contact, no scope creep) | Yes | Least-privilege scopes documented per feature; listing review before launch |
| GitHub API terms — rate limits, no scraping, attribution of bot comments | Yes | Single review per run, backoff on secondary limits, bot identity clear in every comment |
| GDPR / UK GDPR (processor role, DPA, SCCs, records of processing, breach notification within 72h) | Yes | DPA template, EU region option, sub-processor list, breach runbook |
| CCPA/CPRA | Yes | No sale/share of personal data; disclosure in the privacy notice |
| EU AI Act transparency (informing users they interact with AI output) | Likely (limited-risk) | Explicit AI disclosure on every comment and in the dashboard; documentation of system purpose, limits, and human oversight |
| SOC 2 Type II | Enterprise sales gate | Control set aligned from day one; audit after GA |
| ISO 27001 | Enterprise, later | Deferred; policies written to be compatible |
| Accessibility (WCAG 2.2 AA; EAA for EU-facing SaaS) | Yes | Audited before GA (`13_TEST_PLAN.md`) |
| Export control / sanctions screening | Yes | Screening at signup and payment |
| Child-directed rules (COPPA) | No | Not a child-directed product; minimum age 16 in terms |
| App Store / Play Store, IAP | No | No mobile app in scope |
| Sector rules (HIPAA, PCI-DSS) | Not claimed | Quorum does not process PHI or cardholder data itself; customers must not enable repos where source contains such data in cleartext, and this is stated in the terms |
| Open-source licence hygiene of analyzers we bundle | Yes | Licence inventory in CI; copyleft analyzers invoked as separate processes, never linked |

## 10. Incident response

Severity ladder (S1 data exposure → S4 cosmetic) with paging on S1/S2; on-call rota; a documented
72-hour regulatory notification path; customer notification templates; post-incident review
published to affected customers within 10 business days. A **finding-quality incident** (a wave of
false positives from a bad prompt or model change) is treated as S2: the pipeline version is
rolled back, affected comments are minimised with an explanatory note, and impacted orgs are
notified — the reviewer apologising for itself is better than the reviewer being quietly wrong.
