# 18 Release Checklist — Quorum

Three gates: **every release**, **general availability**, and **self-hosted artefact**. A box may
only be ticked by someone who verified it, and the verifier is named in the release record.

---

## A. Every release

### Build and code
- [ ] All CI gates green: lint, `mypy --strict` on the enforced packages, unit, integration, E2E
- [ ] Import-linter boundary contracts pass (`16_REPO_STRUCTURE.md`)
- [ ] SBOM generated; container images signed (cosign); base images patched within 30 days
- [ ] Dependency, container and IaC scans show no new critical or high findings
- [ ] `pipeline_version` bumped if any graph, prompt, ranking, or policy behaviour changed
- [ ] Every changed prompt has a bumped `prompt_version` (CI enforces)

### AI quality gates
- [ ] Eval report attached to the release: precision, recall, false-positive rate, ECE, cost, latency
- [ ] `bench-clean` false-positive rate ≤5%; posted-finding precision ≥90%
- [ ] Recall ≥60% on `bench-injected`; ≥40% on `bench-historical`
- [ ] No metric regressed more than 2 points versus the previous version
- [ ] Adversarial prompt-injection suite: zero instruction-following, zero system-prompt leakage
- [ ] Golden-set diff reviewed by a human and signed off
- [ ] Determinism check passed (same PR, three runs, ≤1 finding variance)

### Data and migrations
- [ ] Migrations are expand/contract and reversible to the previous app version
- [ ] Migration dry-run against a production-shaped dataset completed within the lock budget
- [ ] Backup verified within 24 hours of release; restore rehearsal current within the quarter

### Operations
- [ ] Dashboards updated for any new metric; alerts have runbooks
- [ ] Feature flags default to off for anything not fully evaluated
- [ ] Rollback path rehearsed; blue/green cutover verified in staging
- [ ] Worker drain verified — in-flight runs finish on the version that started them
- [ ] Status page and changelog entries prepared

### Privacy and security
- [ ] Privacy review: no new data category collected without an inventory entry
      (`08_SAFETY_PRIVACY_COMPLIANCE.md` §1) and a retention decision
- [ ] No new outbound data flow without a sub-processor entry and 30-day customer notice
- [ ] Redaction verified on any new payload, log, or trace field
- [ ] Authorisation matrix tests pass for every route × role; no route defaults to allow
- [ ] Secrets scan clean, including fixtures

### Product
- [ ] Accessibility scan clean on changed screens; keyboard pass on any changed flow
- [ ] Copy reviewed: no claim the pipeline cannot substantiate; AI disclosure intact on comments
- [ ] Documentation and API reference regenerated and published

---

## B. General availability (once)

### Marketplace and listing
- [ ] GitHub App listing complete: description, screenshots, support URL, privacy policy, pricing
- [ ] Every requested permission justified in the listing and on the install screen
- [ ] `contents: write` requested only as an optional permission tied to auto-fix
- [ ] Marketplace review passed; verified-publisher requirements met

### Legal and compliance
- [ ] Terms of service, privacy notice, DPA, sub-processor list and SLA published and counsel-reviewed
- [ ] EU/US region selection live and documented; SCCs in place where applicable
- [ ] AI transparency statement published (purpose, limits, human oversight, no autonomous writes)
- [ ] Export-control and sanctions screening active at signup and payment
- [ ] Security page with architecture summary, retention defaults and reporting contact

### Billing
- [ ] Stripe production keys, webhooks, tax configuration and invoicing verified
- [ ] Full lifecycle exercised with test clocks: trial → active → past_due → grace → degrade → recover
- [ ] Metering reconciliation job live with drift alerting under 1%
- [ ] Cap and degradation behaviour verified end to end, including the observe-mode summary comment
- [ ] Refund and cancellation paths self-serve and documented, including the quality refund policy

### Security
- [ ] Third-party penetration test complete; all critical/high findings closed
- [ ] Tenant isolation independently reviewed
- [ ] Sandbox escape testing complete (egress, filesystem, credentials, resource exhaustion)
- [ ] Incident response plan tested in a game day; on-call rota staffed
- [ ] Vulnerability disclosure policy and security contact published

### Quality and QA
- [ ] Beta cohort ≥10 orgs, ≥4 weeks: acceptance rate ≥70%, mute rate <5%
- [ ] p50 time-to-first-comment ≤90s, p95 ≤5min on production traffic
- [ ] Median cost per review ≤$0.35
- [ ] Load test at 10 reviews/second with per-org fairness demonstrated
- [ ] WCAG 2.2 AA audit complete with remediation closed

### Support and operations
- [ ] Support channels, SLAs and escalation documented; help centre live
- [ ] Runbooks exist for every S1/S2 alert, including the finding-quality incident runbook
- [ ] Customer-facing status page automated for S1/S2 incidents lasting >10 minutes
- [ ] Onboarding docs, `.quorum.yaml` reference, and CLI docs published

---

## C. Self-hosted artefact

- [ ] Helm chart and `docker compose` reference install cleanly on a clean cluster and a single VM
- [ ] Upgrade path tested from the previous release, including LangGraph checkpoint schema migration
      with workers drained
- [ ] Offline licence verification works with no outbound network; licence expiry fails open with a warning
- [ ] Air-gapped mode verified: no egress except the configured model endpoint
- [ ] Telemetry off by default and clearly documented
- [ ] Backup/restore documented and rehearsed for customer-owned data stores
- [ ] Version compatibility matrix published (Kubernetes, Postgres, Redis, object storage)
- [ ] Security hardening guide published: network policies, sandbox requirements, secret storage
