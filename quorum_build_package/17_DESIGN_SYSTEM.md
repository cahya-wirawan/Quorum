# 17 Design System — Quorum

## 1. Principles

1. **Evidence is the interface.** The claim is never bigger on screen than the proof beside it.
2. **Quiet by default.** The product's promise is fewer, better comments; the UI must not
   contradict it with dense dashboards and badge clutter.
3. **Density where engineers expect it.** Code, diffs and traces get compact, monospaced,
   information-dense treatment; everything else gets breathing room.
4. **Confidence shown honestly.** Calibrated confidence is displayed as a bounded, labelled value —
   never as a decorative percentage that implies more precision than exists.
5. **Nothing colour-only.** Severity, status and confidence always carry icon + text.
6. **No dark patterns.** Destructive and paid actions are as easy to reverse as to start.
7. **Original identity.** No reference product's palette, mascot, comment layout, or wordmark is
   imitated (`00_REFERENCE_ANALYSIS.md` §8).

## 2. Brand direction

Quorum reads as an instrument, not a personality: precise, calm, slightly technical. The visual
metaphor is *convergence* — several independent readings resolving to one verdict, expressed as a
small mark of overlapping arcs. Typography does the heavy lifting; colour is reserved almost
entirely for severity and state.

## 3. Tokens

```css
:root {
  /* neutrals — the interface is mostly this */
  --q-bg:            #fbfbfa;
  --q-surface:       #ffffff;
  --q-surface-sunken:#f4f4f2;
  --q-border:        #e3e3df;
  --q-border-strong: #c9c9c3;
  --q-text:          #1a1a19;
  --q-text-muted:    #62625d;
  --q-text-faint:    #8a8a83;

  /* brand */
  --q-accent:        #2f5d54;   /* deep green-slate: links, primary actions, focus */
  --q-accent-hover:  #26483f;
  --q-accent-soft:   #e7efec;

  /* severity — the only saturated colours in the product */
  --q-critical:      #8b1d1d;  --q-critical-bg: #fbecec;
  --q-high:          #a5501a;  --q-high-bg:     #fdf0e6;
  --q-medium:        #8a6d12;  --q-medium-bg:   #fbf5e2;
  --q-low:           #3a5f8a;  --q-low-bg:      #eaf1f8;
  --q-info:          #5a5a54;  --q-info-bg:     #f2f2ef;

  /* state */
  --q-ok:            #2c6a45;
  --q-warn:          #97701a;
  --q-danger:        #8b1d1d;
  --q-verifying:     #4a4a8b;

  /* type */
  --q-font-sans: "Inter var", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
  --q-font-mono: "JetBrains Mono", ui-monospace, "SF Mono", Menlo, Consolas, monospace;
  --q-fs-xs: 12px; --q-fs-sm: 13px; --q-fs-base: 14px; --q-fs-lg: 16px;
  --q-fs-xl: 20px; --q-fs-2xl: 26px; --q-fs-3xl: 34px;
  --q-lh-tight: 1.25; --q-lh-base: 1.55; --q-lh-code: 1.5;
  --q-fw-regular: 400; --q-fw-medium: 530; --q-fw-semibold: 620;

  /* space — 4px base */
  --q-1: 4px; --q-2: 8px; --q-3: 12px; --q-4: 16px; --q-5: 24px;
  --q-6: 32px; --q-7: 48px; --q-8: 64px;

  /* radius, elevation, motion */
  --q-radius-sm: 4px; --q-radius: 6px; --q-radius-lg: 10px;
  --q-shadow-1: 0 1px 2px rgba(20,20,18,.06);
  --q-shadow-2: 0 4px 12px rgba(20,20,18,.08);
  --q-dur-fast: 120ms; --q-dur: 180ms; --q-dur-slow: 260ms;
  --q-ease: cubic-bezier(.2,.6,.3,1);

  /* layout */
  --q-max-content: 1440px; --q-sidebar: 248px; --q-evidence-pane: 380px;
}

[data-theme="dark"] {
  --q-bg:#141413; --q-surface:#1c1c1a; --q-surface-sunken:#111110;
  --q-border:#2e2e2b; --q-border-strong:#454540;
  --q-text:#eeeeea; --q-text-muted:#a6a6a0; --q-text-faint:#7b7b75;
  --q-accent:#7fc0ae; --q-accent-hover:#98d3c2; --q-accent-soft:#1e2f2b;
  --q-critical:#f08a8a; --q-critical-bg:#301a1a;
  --q-high:#e8ac74;     --q-high-bg:#2e2115;
  --q-medium:#ddc372;   --q-medium-bg:#2b2616;
  --q-low:#8fb6df;      --q-low-bg:#18232e;
  --q-info:#a8a8a1;     --q-info-bg:#212120;
}
```

Dark mode is a first-class target, not an afterthought — this audience lives in it.

## 4. Typography scale

| Role | Token | Weight | Use |
|---|---|---|---|
| Display | `--q-fs-3xl` | semibold | Empty states, onboarding headlines only |
| Page title | `--q-fs-2xl` | semibold | One per screen |
| Section | `--q-fs-xl` | medium | Panel headers |
| Body | `--q-fs-base` | regular | Default |
| Secondary | `--q-fs-sm` | regular | Metadata, timestamps, counts |
| Micro | `--q-fs-xs` | medium | Chips, table headers (uppercase, 0.04em tracking) |
| Code | `--q-font-mono` at `--q-fs-sm` | regular | Diffs, evidence, traces, identifiers |

Line length is capped at 78 characters for prose (rationale, claims); code blocks scroll
horizontally rather than wrapping, with wrap available as a toggle.

## 5. Components

| Component | Notes |
|---|---|
| `SeverityChip` | Icon + label + colour; five variants; 20px tall; never colour-only |
| `EvidenceClassChip` | Outline chip per class (`static_tool`, `test_failure`, …) with a tooltip *and* an accessible description |
| `ConfidenceMeter` | Segmented bar in five steps with the numeric value and the word (`likely`, `probable`, …); tooltip explains calibration |
| `FindingCard` | Title, claim (one sentence, prominent), file:line link, chips, expandable rationale and evidence; collapsed by default beyond the first |
| `DiffViewer` | Split/unified toggle, syntax highlighting, comment anchors, keyboard line navigation, virtualised for large files |
| `EvidencePanel` | Per-evidence excerpt with a path/line header, "open at head" link, and the retrieval reason |
| `VerdictBanner` | Run-level outcome, counts, degraded lanes, cost, duration |
| `RunTimeline` | Node list with status, duration bar, model and prompt version; live-updating; text-outline alternative to the graph map |
| `GraphMap` | Executed-path visualisation with fan-out branches; decorative — always paired with the timeline |
| `CostBadge` | Credits and USD, with a breakdown popover |
| `PolicyDialog` | Escalation confirmation with typed input, plain-language consequence, and the audit note it will write |
| `EmptyState` | Illustration-light; states what was checked or what to do next; never a bare "No data" |
| `Banner` | Offline, degraded, past-due, deletion-scheduled; dismissible only when non-blocking |
| `DataTable` | Virtualised, sortable, URL-serialised filters, keyboard row activation, sticky header |
| `CommandHint` | Renders the `@quorum …` commands consistently in-app and in PR comment templates |

PR comment templates are part of the design system too: a fixed structure (severity line, one-sentence
claim, why-it-matters, evidence citation, optional suggestion, footer with disclosure and links),
plain-Markdown-first so it degrades correctly in email notifications, and capped in length so a
comment never buries the diff.

## 6. Interaction and motion

- Motion is functional only: 120–180ms fades and 2–4px translations for entry; no bounce, no
  parallax, no attention-seeking animation.
- The live run timeline animates node transitions; everything else appears without animation.
- All motion respects `prefers-reduced-motion: reduce` by dropping to instant state changes.
- Optimistic UI for dismissals and settings, with an inline undo for 8 seconds.
- Destructive actions require an explicit confirm; irreversible ones require typed confirmation.
- Keyboard: `j`/`k` move between findings, `Enter` opens, `e` opens evidence, `d` dismisses,
  `/` focuses search, `g r` goes to runs, `?` shows shortcuts. Every shortcut has a menu equivalent.

## 7. Accessibility

WCAG 2.2 AA as a release gate (`13_TEST_PLAN.md` §8). Concretely:
- Contrast ≥4.5:1 for text and ≥3:1 for UI boundaries in both themes; the severity palette was
  chosen against both backgrounds.
- Every interactive element is reachable and operable by keyboard with a visible 2px focus ring in
  `--q-accent` at ≥3:1 against its background.
- The diff viewer exposes line numbers, change type and file path to assistive technology; comment
  anchors are announced with their severity and file:line.
- Run status changes announce through a polite live region; failures announce assertively.
- Icons have text alternatives; charts have data-table equivalents; no information is conveyed by
  colour, position, or hover alone.
- Target size ≥24×24px with adequate spacing; forms have persistent labels and inline, associated
  error text; no timing-dependent interactions except the 8-second undo, which also has a permanent
  reverse path.
