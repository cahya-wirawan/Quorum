# Quorum Web Dashboard (`apps/web`)

**The evidence-first web interface for the Quorum Autonomous Code Review Pipeline.**

The Quorum dashboard implements all 17 screens (S01 through S17) specified in [`quorum_build_package/02_UX_SCREEN_SPEC.md`](../../quorum_build_package/02_UX_SCREEN_SPEC.md) and strictly adheres to the design tokens, color palette, and accessibility standards defined in [`quorum_build_package/17_DESIGN_SYSTEM.md`](../../quorum_build_package/17_DESIGN_SYSTEM.md).

---

## Screen Directory & Routes

| Screen | Route | Role | Description & Specifications |
|---|---|---|---|
| **S01 — Connect Git Provider** | `/settings/integrations`, `/onboarding/connect` | Org Admin | Multi-provider cards (GitHub, GitLab, Azure), plain-English permissions list, cloud vs self-hosted target selector. |
| **S02 — Repository Selection** | `/repos`, `/onboarding/repos` | Org Admin / Maintainer | Searchable repo table, operational state (`Disabled` / `Observe` / `Active`), real-time indexing progress bar (`cloning → parsing → symbol index → embeddings`), diff-scoped retrieval warnings (`FR-003`). |
| **S03 — Guided First Review** | `/repos/[id]/trial`, `/onboarding/trial` | Org Admin / Maintainer | Safe historical PR simulation locked in `observe` mode; live LangGraph simulation timeline; dynamic comment budget slider (1–15) with side-by-side posted vs held comparison. |
| **S04 — Reviews Inbox** | `/runs` | All | *Primary Screen:* Org-wide review runs, verdict badges, posted/held counts, URL-synchronized filters (`useSearchParams`), CSV export. |
| **S05 — Review Detail** | `/runs/[id]` | Member+ | *Primary Screen:* 3-pane review view (Left: findings list grouped by `Posted` / `Held` / `Suppressed` / `Refuted`; Center: interactive `DiffViewer`; Right: `EvidencePanel` with Adversarial Verifier refutation attempts and verdicts); dismissal modal with fixed list and free-text context. |
| **S06 — Run Trace Inspector** | `/runs/[id]/trace` | Maintainer+ | `RunTimeline` and collapsible `GraphMap` DAG; routed model tiers and escalation triggers; server-redacted JSON payloads with 256 KB truncation threshold and download action (`FR-050`). |
| **S07 — Repository Settings** | `/repos/[id]/settings` | Maintainer / Owner | Scope filters, lane toggles, comment budget slider (1–25), policy escalations with `PolicyDialog` typed confirmation, effective config layer hierarchy viewer, and live `.quorum.yaml` preview. |
| **S08 — Rules Editor** | `/rules` | Maintainer+ | Natural-language team conventions, scope globs, and executable unit test harness with positive ("should flag") and negative ("should not flag") code samples (`FR-025`, `FR-030`). |
| **S09 — Inferred Learnings** | `/learnings` | Maintainer+ | Machine-inferred suppression rules derived from developer feedback (`FR-061`), origin finding links, scope promotion (repo → org) with typed confirmation for High/Critical suppressions. |
| **S10 — Analytics & Yield** | `/analytics` | All | Acceptance rate over time, comment yield, per-lane precision, spend vs monthly cap, repository leaderboard, `<20` runs "Not Enough Data" validation, and strict **Zero Developer Surveillance** guarantee (no individual author tracking). |
| **S11 — Team & Members** | `/org/members` | Owner | Member roster, role assignment (`owner`, `maintainer`, `member`, `auditor`), last owner demotion prevention guard, invitations, and enterprise SSO/SCIM config. |
| **S12 — Models, Providers & Routing** | `/settings/providers` | Owner | Per node-class model assignments, tiers (1 cheap, 2 mid, 3 strong), connection test status, adaptive escalation triggers (ambiguous confidence, AST complexity), and live cost savings report (`AC-084`, `AC-085`). |
| **S13 — Billing & Plans** | `/billing` | Owner | Subscription plan cards, credit usage meter, overage policies (`degrade to observe` / `notify only`), invoice history, and PDF download. |
| **S14 — Audit Log** | `/audit` | Owner / Auditor | Immutable chronological activity stream, facet filters, NDJSON log export, and SIEM integration controls. |
| **S15 — Data & Privacy** | `/settings/privacy` | Owner | Trace and finding retention window sliders, code excerpt persistence toggle, sub-processor registry, DPA agreement download, and 24-hour deletion request flow. |
| **S16 — System Health** | `/health` | Owner / Operator | Ingress queue depth, runner pool status, checkpointer lag, provider latency and 5xx error rate table, and global emergency mute toggle. |
| **S17 — Account & Credentials** | `/account` | User | User profile, linked Git host identity, notification preferences, personal access token (PAT) generator with one-time reveal, and active login sessions. |

---

## Design System & Accessibility (`17_DESIGN_SYSTEM.md`)

- **Tokens & Theming**: Defined in [`styles/tokens.css`](styles/tokens.css) with semantic CSS custom properties for surfaces, borders, text contrast, accent colors, and elevation.
- **Dark Mode**: Fully supported via `[data-theme="dark"]` attribute toggle.
- **Dual-Channel Indicators**: Severity and status are never communicated by color alone. Every chip features an explicit icon + label + color (`SeverityChip.tsx`, `EvidenceClassChip.tsx`).
- **Honest Calibrated Confidence**: Confidence is presented via bounded, calibrated labels (`Definite`, `Probable`, `Likely`, `Uncertain`) rather than decorative pseudo-exact percentages (`ConfidenceMeter.tsx`).
- **Legible Silence**: Empty states explicitly report what was checked—including evaluated lanes, file counts reviewed vs. skimmed, and passed ground truth analyzers (`EmptyState.tsx`).
- **Confirmation Safeguards**: High-risk operations (blocking CI checks, bot approvals, data deletion) require typed confirmation strings via [`PolicyDialog.tsx`](components/PolicyDialog.tsx).
- **WCAG 2.2 AA Compliance**: Contrast ratios >= 4.5:1 for normal text, keyboard-focusable landmarks, `aria-label` attributes, and accessible text alternatives for visual graphs.

---

## Technology Stack

- **Framework**: [Next.js 15](https://nextjs.org/) (App Router, Server & Client Components)
- **UI Runtime**: [React 19](https://react.dev/)
- **Styling**: Pure semantic CSS tokens & modern utility classes (zero heavy CSS-in-JS runtime overhead)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Type Checking**: TypeScript 5.9 (Strict mode enabled)
- **Data Layer**: Typed client in [`lib/api.ts`](lib/api.ts) connecting to `services/api` (`/v1`) with offline fallback in [`lib/mockData.ts`](lib/mockData.ts).

---

## Local Development & Verification

```bash
# Navigate to web dashboard
cd apps/web

# Install dependencies
npm install

# Run the development server
npm run dev

# Run TypeScript strict typecheck
./node_modules/typescript/bin/tsc -p tsconfig.json --noEmit

# Build production bundle (generates all 20 static and dynamic routes)
npm run build

# Start production server
npm run start
```
