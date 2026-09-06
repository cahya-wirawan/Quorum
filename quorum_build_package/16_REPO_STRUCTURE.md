# 16 Repository Structure — Quorum

A single repository. Python services are managed with `uv` (Python 3.12); the web app and CLI-adjacent
tooling use a pnpm workspace. Boundaries are enforced by an import-linter contract, not convention.

```text
quorum/
├── README.md
├── Makefile                       # dev, test, lint, migrate, eval, seed
├── pyproject.toml                 # uv workspace root
├── pnpm-workspace.yaml
├── docker-compose.yml             # local stack: postgres x2, redis, minio, langgraph-server, gh-fake
├── .github/workflows/
│   ├── ci.yml                     # lint, types, unit, integration, sbom, sign
│   ├── eval.yml                   # blocking AI eval gate
│   ├── e2e.yml                    # Playwright against ephemeral stack
│   └── release.yml                # build, migrate dry-run, deploy staging, promote
│
├── packages/                      # Python
│   ├── core/                      # domain: NO framework imports, NO I/O
│   │   └── quorum_core/
│   │       ├── models.py          # Finding, Evidence, Verification, Policy, RepoConfig
│   │       ├── fingerprint.py
│   │       ├── ranking.py         # severity weights, calibration application, budget
│   │       ├── policy.py
│   │       ├── suppression.py
│   │       ├── config_merge.py    # default -> org -> ui -> .quorum.yaml
│   │       └── errors.py
│   │
│   ├── graph/                     # the LangGraph pipeline
│   │   └── quorum_graph/
│   │       ├── state.py           # ReviewState + reducers
│   │       ├── build.py           # StateGraph assembly, compile(), fan-out helpers
│   │       ├── nodes/
│   │       │   ├── ingest.py  triage.py  deterministic.py
│   │       │   ├── dedupe_merge.py  rank.py  policy.py
│   │       │   ├── publish.py  publish_skip.py  learn.py  approval.py
│   │       ├── subgraphs/
│   │       │   ├── retrieval/     # symbol expansion, hybrid search, budgeting
│   │       │   ├── lane/          # lane factory + per-lane specs
│   │       │   ├── verify/        # adversarial verifier + read-only tools
│   │       │   └── fix/           # patch drafting + sandbox validation
│   │       ├── tools/             # read_file, find_symbol, find_references, read_test, git_log
│   │       └── checkpointing.py   # AsyncPostgresSaver + Store wiring, durability policy
│   │
│   ├── prompts/                   # versioned prompt assets (see 19_PROMPT_LIBRARY.md)
│   │   └── quorum_prompts/
│   │       ├── registry.py        # id + version resolution, render, hash
│   │       └── assets/<prompt_id>/<version>.md + schema.json
│   │
│   ├── providers/                 # model provider abstraction
│   │   └── quorum_providers/
│   │       ├── base.py            # ModelProvider protocol, ModelResult
│   │       ├── anthropic.py  openai_compatible.py  local.py
│   │       ├── routing.py         # node-class -> provider config, tiers, roles, fallback chain
│       ├── adaptive.py        # pure route() over signals, escalation triggers, budgets
│       ├── route_plan.py      # plan hashing, caching, reuse on re-run and replay
│   │       ├── cache.py  cost.py  redaction.py
│   │
│   ├── vcs/                       # git-host abstraction
│   │   └── quorum_vcs/
│   │       ├── base.py            # PullRequestHost protocol
│   │       ├── github/            # app auth, REST client, review posting, checks, backoff
│   │       ├── gitlab/            # P1
│   │       └── fake/              # deterministic fixture host for tests
│   │
│   ├── analysis/                  # deterministic analyzers
│   │   └── quorum_analysis/
│   │       ├── registry.py  sarif.py  runner.py
│   │       └── adapters/          # ruff, eslint, mypy, tsc, semgrep, gitleaks, pip-audit, pytest
│   │
│   ├── indexing/
│   │   └── quorum_indexing/
│   │       ├── parse/             # tree-sitter grammars and symbol extraction
│   │       ├── graph.py           # call/import/inherit edges, SCIP/LSIF import
│   │       ├── embed.py  search.py  incremental.py
│   │
│   ├── storage/                   # persistence, the only layer that touches the database
│   │   └── quorum_storage/
│   │       ├── db.py              # engine, session, org-scoped repository base
│   │       ├── repositories/      # runs, findings, evidence, feedback, rules, learnings, billing
│   │       ├── objects.py         # S3-compatible artefacts and traces
│   │       ├── cache.py           # redis
│   │       └── migrations/        # alembic
│   │
│   └── telemetry/
│       └── quorum_telemetry/      # otel, metrics, redacting log formatter, event emitter
│
├── services/
│   ├── api/                       # FastAPI: public API + BFF + SSE
│   │   └── quorum_api/
│   │       ├── main.py  deps.py  authz.py       # @requires decorator, permission matrix as data
│   │       ├── routers/           # runs, findings, repos, rules, learnings, org, billing, privacy, audit
│   │       └── schemas/
│   ├── ingress/                   # webhook receiver only; no model or git-api calls inline
│   │   └── quorum_ingress/
│   ├── worker/                    # queue consumer that executes graph runs
│   │   └── quorum_worker/
│   │       ├── consumer.py  lease.py  supersede.py  watchdog.py
│   ├── runner/                    # sandbox job entrypoint (analyzers, checkout, patch apply)
│   │   └── quorum_runner/
│   ├── indexer/                   # index build/update jobs
│   └── scheduler/                 # retention, calibration, reconciliation, seat counting, DLQ replay
│
├── apps/
│   ├── web/                       # Next.js 15 dashboard
│   │   ├── app/(dash)/            # runs, runs/[id], repos, repos/[id]/settings, rules, learnings,
│   │   │                          # analytics, org, billing, privacy, audit, health
│   │   ├── components/            # DiffViewer, FindingCard, EvidencePanel, RunTimeline, SeverityChip
│   │   ├── lib/                   # api client, SSE hook, permissions, formatting
│   │   └── styles/tokens.css
│   └── cli/                       # `quorum` console script (Python, shares packages/graph)
│       └── quorum_cli/
│
├── evals/
│   ├── corpora/                   # bench-clean, bench-injected, bench-historical, adversarial
│   ├── harness/                   # runner, metrics, report generation, gate thresholds
│   ├── labels/                    # versioned labelling guide + human labels
│   └── golden/                    # 30 hand-labelled PRs reviewed by a human each release
│
├── deploy/
│   ├── helm/quorum/               # self-hosted chart
│   ├── k8s/                       # base manifests, network policies, sandbox job template
│   ├── terraform/                 # cloud offering infrastructure
│   └── selfhost/                  # docker-compose reference, offline licence tooling
│
├── docs/
│   ├── product/                   # this build package
│   ├── runbooks/                  # one per alert in 12_ANALYTICS_AND_OBSERVABILITY.md
│   ├── api/                       # generated OpenAPI + guides
│   └── selfhost/
│
└── tests/
    ├── unit/  integration/  e2e/  security/  load/  chaos/
    └── fixtures/repos/            # small repos with seeded defects
```

## Boundary rules (enforced by `importlinter`)

1. `core` imports nothing from `graph`, `services`, `storage`, `providers`, or `vcs`. It is pure
   domain logic and is the only place with 100% coverage requirements.
2. `graph` may import `core`, `prompts`, `providers`, `vcs`, `analysis`, `indexing`, `telemetry` —
   never `services` or `apps`.
3. Only `storage` touches the database. A CI check fails on `sqlalchemy` or raw SQL imports
   anywhere else.
4. Only `vcs` makes Git-host calls; only `providers` makes model calls; only `runner` executes
   untrusted code. Each has a single choke point that is easy to audit and rate-limit.
5. `ingress` may not import `graph` or `providers` — it must stay fast and boring.
6. `apps/web` talks only to `services/api`; it never reaches the database or object storage.
7. Prompt text lives only in `packages/prompts/assets`; a lint rule fails on multi-line string
   literals containing prompt-like content elsewhere.

## Conventions

- Python: `ruff` (lint + format), `mypy --strict` on `core`, `graph`, `storage`; `pytest` with
  `pytest-asyncio`; no bare `except`; every public function typed.
- TypeScript: `eslint` + `prettier`, `tsc --strict`, `vitest`, Playwright for E2E.
- Commits: conventional commits; PRs must state whether they change `pipeline_version` or any
  `prompt_version`, and CI blocks a prompt change that does not bump its version.
- Every service ships a `/healthz` (liveness) and `/readyz` (dependency check) endpoint.
