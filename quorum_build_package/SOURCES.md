# Sources

All entries accessed **2026-09-06** unless noted. Web results were gathered through search
and page fetches on that date. Claims sourced to vendor marketing are labelled as vendor
claims, not independent measurements.

## Official product and platform documentation

| # | Source | URL | Supports |
|---|---|---|---|
| S1 | GitHub Docs — Using GitHub Copilot code review | https://docs.github.com/copilot/using-github-copilot/code-review/using-copilot-code-review | Copilot review behaviour, typical sub-30-second latency, premium-request consumption |
| S2 | GitHub Changelog — Copilot code review: resolution reasons and expanded capabilities (2026-08-27) | https://github.blog/changelog/2026-08-27-copilot-code-review-resolution-reasons-and-expanded-capabilities/ | Resolution reasons; review of bot-authored and very large PRs |
| S3 | GitHub Changelog — Copilot code review can now approve pull requests (2026-09-01) | https://github.blog/changelog/2026-09-01-copilot-code-review-can-now-approve-pull-requests/ | Bot approval, off by default, enterprise/org/repo configurable |
| S4 | GitHub Changelog — Request Copilot code review from GitHub CLI (2026-03-11) | https://github.blog/changelog/2026-03-11-request-copilot-code-review-from-github-cli/ | Terminal-initiated review as a category expectation |
| S5 | GitHub REST API — Pull request reviews | https://docs.github.com/en/rest/pulls/reviews | Create/submit/dismiss review endpoints, `APPROVE`/`REQUEST_CHANGES`/`COMMENT`, PENDING reviews, secondary rate limiting |
| S6 | GitHub REST API — Pull request review comments | https://docs.github.com/en/rest/pulls/comments | Inline comment anchoring: `path`, `line`, `side`, `start_line`, `position` |
| S7 | GitHub REST API — Pull requests | https://docs.github.com/en/rest/pulls/pulls | PR/diff retrieval, pagination |
| S8 | Microsoft Learn — Copilot code review in Azure Repos | https://learn.microsoft.com/en-us/azure/devops/repos/git/copilot-code-reviews | Multi-host expectations beyond GitHub |
| S9 | CodeRabbit documentation home | https://docs.coderabbit.ai/ | Supported hosts (GitHub, GitLab, Azure DevOps, Bitbucket), review outputs, chat commands, IDE/CLI surfaces, Jira/Linear links |
| S10 | LangChain docs — LangGraph overview | https://docs.langchain.com/oss/python/langgraph/overview | `StateGraph`, `add_node`/`add_edge`/`add_conditional_edges`, `START`/`END`, reducers, `InMemorySaver`/`PostgresSaver`, `Store`, `interrupt()`, `Command(resume=…)`, `Send`, subgraphs, streaming modes |
| S11 | LangChain docs — Durable execution | https://docs.langchain.com/oss/python/langgraph/durable-execution | Durability modes `exit` / `async` / `sync` and their trade-offs; checkpoint-and-resume semantics |
| S12 | LangChain docs — Interrupts | https://docs.langchain.com/oss/python/langgraph/interrupts | Pausing mid-graph, persisting state, resuming with `Command` |
| S13 | LangGraph — Deployment options | https://github.com/langchain-ai/langgraph/blob/main/docs/docs/concepts/deployment_options.md | Cloud SaaS, self-hosted data plane, standalone container |
| S14 | LangChain docs — Self-host standalone server | https://docs.langchain.com/langsmith/deploy-standalone-server | Standalone container requirements including `REDIS_URI` for streaming |
| S15 | Qodo Merge / PR-Agent (open source) | https://github.com/qodo-ai/pr-agent | `/review`, `/improve`, `/ask`, `/update_changelog`, `/add_docs`; managed app or self-hosted GitHub Action |

## Vendor claims and press

| # | Source | URL | Supports | Caveat |
|---|---|---|---|---|
| S16 | Greptile Agent v4 announcement (vendor, via LinkedIn post by the company's founder) | https://www.linkedin.com/posts/dakshg_today-were-releasing-greptile-agent-v4-activity-7435353275857743872-7idK | "Swarm agents" multi-perspective review architecture | Vendor claim |
| S17 | Agent Wars — Greptile per-review pricing change (2026-05-01) | https://www.agent-wars.com/news/2026-05-01-greptile-per-review-pricing | Usage-pricing backlash as a category risk | Trade press |
| S18 | Levelop — Best AI code review tools 2026 comparison | https://levelop.dev/blog/best-ai-code-review-tools-2026-coderabbit-greptile-qodo-compared | Cross-product feature and pricing comparison | Third-party round-up |
| S19 | ToolRadar / WeavAI CodeRabbit pricing pages | https://toolradar.com/tools/coderabbit/pricing | Free / Pro (~$24 annual, $30 monthly) / Pro+ (~$48) seat pricing | Third-party; verify against vendor page before quoting publicly |

## Benchmarks (third-party, cited as published claims)

| # | Source | URL | Supports | Caveat |
|---|---|---|---|---|
| S20 | CodeAnt — AI code review benchmark results | https://www.codeant.ai/blogs/ai-code-review-benchmark-results-from-200-000-real-pull-requests | Precision/recall/F1 framing over large real-PR corpora | Published by a vendor in the same category |
| S21 | Entelligence — 2026 AI code review benchmark | https://entelligence.ai/code-review-benchmark-2026 | Comparative precision/recall/F1 | Vendor-published |
| S22 | DeepSource — AI code review tools compared | https://deepsource.com/resources/ai-code-review-tools | False positives as the leading complaint; style-noise share of comments | Vendor-published |
| S23 | Reporting on the Martian independent benchmark of AI code review agents (17 tools, ~300k PRs, Feb 2026), with dataset, judge prompts and pipeline said to be open-sourced | https://codeant.ai/blogs/best-ai-code-review-tools | Existence and shape of an independent benchmark to evaluate against | Secondary reporting; the primary artefact was not inspected during this research |

## Research notes and limitations

- No reference product was purchased, installed, or run during this research; no
  proprietary artefact was accessed. All reference claims come from public documentation,
  changelogs, vendor statements, and third-party write-ups.
- Pricing figures move quickly and several were read from third-party aggregators. They
  are directionally reliable for competitive positioning and must be re-checked against
  the vendors' own pricing pages before appearing in any Quorum-facing material.
- Benchmark numbers in S20–S23 are cited as published claims. Quorum's own precision
  numbers must come from the eval harness in `13_TEST_PLAN.md`, run on a corpus this
  project controls.
- Where a LangGraph API detail mattered to the architecture, it was taken from S10–S14 on
  2026-09-06; pin the exact `langgraph` package version at implementation time and re-read
  the durability and interrupt pages, which have changed shape during 2026.
