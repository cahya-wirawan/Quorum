/**
 * Rich mock fixtures for Quorum Web Dashboard (Screens S01 - S17).
 * Provides realistic offline & testing data when the API is not active.
 */

export interface Finding {
  id: string;
  lane: "correctness" | "security" | "api_contract" | "tests" | "style";
  category: string;
  severity: "critical" | "high" | "medium" | "low" | "info";
  title: string;
  claim: string;
  rationale: string;
  file_path: string;
  start_line: number;
  end_line: number;
  raw_confidence: number;
  calibrated_confidence: number;
  rank_score: number;
  status: "confirmed" | "posted" | "held" | "suppressed" | "refuted";
  suggested_patch?: string;
  evidence: Array<{
    cls: "static_tool" | "test_failure" | "symbol_resolution" | "spec_violation" | "reproduction" | "heuristic";
    source: string;
    file_path?: string;
    start_line?: number;
    end_line?: number;
    excerpt?: string;
    detail?: Record<string, unknown>;
  }>;
  verification?: {
    verdict: "confirmed" | "refuted" | "unprovable";
    refutation_attempt: string;
    tool_calls_count: number;
    duration_ms: number;
  };
}

export interface RunSummary {
  id: string;
  repo_id: string;
  pr_number: number;
  pr_title: string;
  author: string;
  head_sha: string;
  base_sha: string;
  pipeline_version: string;
  config_version: number;
  state: "queued" | "running" | "completed" | "failed" | "cancelled" | "awaiting_human";
  verdict: "clean" | "actionable" | "degraded";
  lanes_run: string[];
  lanes_degraded: string[];
  posted_count: number;
  held_count: number;
  suppressed_count: number;
  refuted_count: number;
  cost_estimate_usd: number;
  tokens_consumed: number;
  duration_seconds: number;
  created_at: string;
}

export interface TraceNode {
  id: string;
  node_name: string;
  tier: "tier_1_cheap" | "tier_2_mid" | "tier_3_strong";
  model: string;
  prompt_version: string;
  status: "success" | "degraded" | "running";
  duration_ms: number;
  tokens_in: number;
  tokens_out: number;
  cost_usd: number;
  escalated_from?: string;
  escalation_trigger?: string;
  route_reason?: string;
}

export interface Repository {
  id: string;
  name: string;
  full_name: string;
  default_branch: string;
  language: string;
  primary_language: string;
  size_mb: number;
  size_kb: number;
  state: "disabled" | "observe" | "active";
  retrieval_mode: "indexed" | "diff_scoped";
  indexing_progress: {
    stage: "cloning" | "parsing" | "symbol_index" | "embeddings";
    percent: number;
    error?: string | null;
  };
  index_status: "done" | "indexing" | "failed";
  runs_count: number;
}
export type RepositoryItem = Repository;

export interface RuleSpecCase {
  id: string;
  expected: "should_flag" | "should_not_flag";
  code_sample: string;
  explanation: string;
}

export interface Rule {
  id: string;
  name: string;
  rule_text: string;
  scope_globs: string[];
  severity: "critical" | "high" | "medium" | "low" | "info";
  status: "enabled" | "disabled";
  hit_count: number;
  dismissal_count: number;
  spec_cases: RuleSpecCase[];
}
export type RuleItem = Rule;

export interface Learning {
  id: string;
  statement: string;
  scope: "repository" | "org";
  origin_finding_id: string;
  created_at: string;
  suppression_count: number;
  last_used: string;
  suppresses_severity: Array<"critical" | "high" | "medium" | "low" | "info">;
}

export const MOCK_REPOSITORIES: Repository[] = [
  {
    id: "acme/backend",
    name: "acme/backend",
    full_name: "acme/backend",
    default_branch: "main",
    language: "Python",
    primary_language: "Python",
    size_mb: 48.2,
    size_kb: 48200,
    state: "active",
    retrieval_mode: "indexed",
    indexing_progress: {
      stage: "embeddings",
      percent: 100,
      error: null,
    },
    index_status: "done",
    runs_count: 142,
  },
  {
    id: "acme/payment-gateway",
    name: "acme/payment-gateway",
    full_name: "acme/payment-gateway",
    default_branch: "main",
    language: "Python",
    primary_language: "Python",
    size_mb: 32.1,
    size_kb: 32100,
    state: "active",
    retrieval_mode: "indexed",
    indexing_progress: {
      stage: "embeddings",
      percent: 100,
      error: null,
    },
    index_status: "done",
    runs_count: 84,
  },
  {
    id: "acme/frontend",
    name: "acme/frontend",
    full_name: "acme/frontend",
    default_branch: "main",
    language: "TypeScript",
    primary_language: "TypeScript",
    size_mb: 610.5,
    size_kb: 610500,
    state: "observe",
    retrieval_mode: "diff_scoped",
    indexing_progress: {
      stage: "embeddings",
      percent: 74,
      error: null,
    },
    index_status: "indexing",
    runs_count: 58,
  },
];

export const MOCK_RUNS: RunSummary[] = [
  {
    id: "run_942",
    repo_id: "acme/backend",
    pr_number: 412,
    pr_title: "Add refund retry handler and stripe webhooks",
    author: "alice",
    head_sha: "7f2a89c",
    base_sha: "3b198da",
    pipeline_version: "2026.09.1",
    config_version: 1,
    state: "completed",
    verdict: "actionable",
    lanes_run: ["correctness", "security", "api_contract", "tests"],
    lanes_degraded: [],
    posted_count: 2,
    held_count: 6,
    suppressed_count: 3,
    refuted_count: 5,
    cost_estimate_usd: 0.18,
    tokens_consumed: 42100,
    duration_seconds: 74,
    created_at: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
  },
  {
    id: "run_941",
    repo_id: "acme/frontend",
    pr_number: 88,
    pr_title: "Migrate auth session cookies to HTTP-only",
    author: "bob",
    head_sha: "e49f01b",
    base_sha: "1a82f3c",
    pipeline_version: "2026.09.1",
    config_version: 1,
    state: "completed",
    verdict: "clean",
    lanes_run: ["correctness", "security", "tests"],
    lanes_degraded: [],
    posted_count: 0,
    held_count: 1,
    suppressed_count: 1,
    refuted_count: 4,
    cost_estimate_usd: 0.12,
    tokens_consumed: 28400,
    duration_seconds: 52,
    created_at: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
  },
];

export const MOCK_FINDINGS: Finding[] = [
  {
    id: "find_4f2",
    lane: "correctness",
    category: "idempotency",
    severity: "high",
    title: "Refund retry drops the idempotency key",
    claim: "On retry, refund_payment() regenerates idempotency_key, so a duplicate refund can be issued.",
    rationale: "retry_wrapper (retries.py:44) calls refund_payment without passing the original key.",
    file_path: "payments/refund.py",
    start_line: 118,
    end_line: 124,
    raw_confidence: 0.88,
    calibrated_confidence: 0.79,
    rank_score: 8.2,
    status: "posted",
    suggested_patch: "@@ -118,3 +118,3 @@\n-def refund_payment(charge_id: str) -> Refund:\n+def refund_payment(charge_id: str, *, idempotency_key: str) -> Refund:",
    evidence: [
      {
        cls: "symbol_resolution",
        source: "retrieval_subgraph",
        file_path: "payments/retries.py",
        start_line: 44,
        end_line: 48,
        excerpt: "def retry_wrapper(fn):\n    # drops idempotency parameters\n    return fn()",
      },
      {
        cls: "test_failure",
        source: "deterministic_runner",
        excerpt: "test_refund_retry_duplicate_prevention FAILED",
      },
    ],
    verification: {
      verdict: "confirmed",
      refutation_attempt: "Inspected caller at payments/retries.py:44 and confirmed no key parameter is forwarded. Existing guard in charge.py only checks initial call.",
      tool_calls_count: 3,
      duration_ms: 1420,
    },
  },
  {
    id: "find_8a1",
    lane: "api_contract",
    category: "breaking_change",
    severity: "medium",
    title: "Response field removed without a version bump",
    claim: "Field 'customer_tax_id' was deleted from UserResponse schema breaking client compatibility.",
    rationale: "API schema guidelines mandate deprecation period before removal.",
    file_path: "api/schemas.py",
    start_line: 44,
    end_line: 49,
    raw_confidence: 0.92,
    calibrated_confidence: 0.84,
    rank_score: 5.4,
    status: "posted",
    evidence: [
      {
        cls: "spec_violation",
        source: "api_contract_lane",
        file_path: "api/schemas.py",
        start_line: 44,
        end_line: 49,
        excerpt: "class UserResponse(BaseModel):\n-    customer_tax_id: str | None\n+    tax_identifier: str | None",
      },
    ],
    verification: {
      verdict: "confirmed",
      refutation_attempt: "Checked v1 clients in mobile/api.ts. Mobile client still consumes customer_tax_id.",
      tool_calls_count: 2,
      duration_ms: 980,
    },
  },
  {
    id: "find_held_1",
    lane: "security",
    category: "token_logging",
    severity: "low",
    title: "Potential token hash printed in debug log",
    claim: "Debug statement logs partial token prefix which may assist brute-force attacks.",
    rationale: "Held below comment budget (ranked below top 2 actionable findings).",
    file_path: "auth/tokens.py",
    start_line: 82,
    end_line: 83,
    raw_confidence: 0.65,
    calibrated_confidence: 0.60,
    rank_score: 2.1,
    status: "held",
    evidence: [
      {
        cls: "static_tool",
        source: "semgrep",
        excerpt: "logger.debug(f'Verifying token: {token[:6]}...')",
      },
    ],
    verification: {
      verdict: "confirmed",
      refutation_attempt: "Verified logger level is debug only, but could be active in staging.",
      tool_calls_count: 1,
      duration_ms: 650,
    },
  },
];

export const MOCK_TRACES: TraceNode[] = [
  {
    id: "node_ingest",
    node_name: "ingest",
    tier: "tier_1_cheap",
    model: "claude-haiku-4-5",
    prompt_version: "v3",
    status: "success",
    duration_ms: 280,
    tokens_in: 1200,
    tokens_out: 140,
    cost_usd: 0.001,
  },
  {
    id: "node_triage",
    node_name: "triage",
    tier: "tier_1_cheap",
    model: "claude-haiku-4-5",
    prompt_version: "v3",
    status: "success",
    duration_ms: 410,
    tokens_in: 3200,
    tokens_out: 220,
    cost_usd: 0.003,
  },
  {
    id: "node_correctness",
    node_name: "lane:correctness",
    tier: "tier_2_mid",
    model: "claude-sonnet-5",
    prompt_version: "v5",
    status: "success",
    duration_ms: 2840,
    tokens_in: 14200,
    tokens_out: 1240,
    cost_usd: 0.045,
    route_reason: "High diff complexity and payment path sensitivity",
  },
  {
    id: "node_verify",
    node_name: "verify:find_4f2",
    tier: "tier_3_strong",
    model: "claude-opus-5",
    prompt_version: "v4",
    status: "success",
    duration_ms: 4820,
    tokens_in: 21000,
    tokens_out: 1850,
    cost_usd: 0.112,
    escalated_from: "tier_2_mid",
    escalation_trigger: "High severity finding in ambiguous confidence band [0.70 - 0.85]",
    route_reason: "Verification never economises on confirmed candidate",
  },
  {
    id: "node_policy",
    node_name: "policy",
    tier: "tier_1_cheap",
    model: "claude-haiku-4-5",
    prompt_version: "v2",
    status: "success",
    duration_ms: 180,
    tokens_in: 4100,
    tokens_out: 320,
    cost_usd: 0.004,
  },
  {
    id: "node_publish",
    node_name: "publish",
    tier: "tier_1_cheap",
    model: "deterministic",
    prompt_version: "v1",
    status: "success",
    duration_ms: 620,
    tokens_in: 0,
    tokens_out: 0,
    cost_usd: 0.0,
  },
];

export const MOCK_RULES: Rule[] = [
  {
    id: "rule_1",
    name: "No direct SQL in HTTP handlers",
    rule_text: "HTTP request handlers must not construct raw SQL query strings; call the repository layer.",
    scope_globs: ["api/**", "handlers/**"],
    severity: "high",
    status: "enabled",
    hit_count: 14,
    dismissal_count: 1,
    spec_cases: [
      {
        id: "sc_1",
        expected: "should_flag",
        code_sample: "db.execute(f'SELECT * FROM users WHERE id = {user_id}')",
        explanation: "Raw f-string SQL query detected in API handler",
      },
      {
        id: "sc_2",
        expected: "should_not_flag",
        code_sample: "user = user_repo.get_by_id(user_id)",
        explanation: "Valid repository call pattern",
      },
    ],
  },
  {
    id: "rule_2",
    name: "Idempotency key required on payment mutations",
    rule_text: "Any public refund or charge endpoint must accept an idempotency_key parameter.",
    scope_globs: ["payments/**"],
    severity: "critical",
    status: "enabled",
    hit_count: 28,
    dismissal_count: 2,
    spec_cases: [
      {
        id: "sc_3",
        expected: "should_flag",
        code_sample: "def refund_payment(charge_id: str) -> Refund:\n    pass",
        explanation: "Missing idempotency key in refund method signature",
      },
    ],
  },
];

export const MOCK_LEARNINGS: Learning[] = [
  {
    id: "learn_1",
    statement: "In alembic migration scripts, raw schema modifications are permitted and do not require repository encapsulation.",
    scope: "repository",
    origin_finding_id: "find_alembic_sql_01",
    created_at: "2026-09-02",
    suppression_count: 12,
    last_used: "Yesterday",
    suppresses_severity: ["high", "medium"],
  },
  {
    id: "learn_2",
    statement: "Test mock fixtures in tests/conftest.py may use hardcoded fake tokens.",
    scope: "org",
    origin_finding_id: "find_hardcoded_jwt_test",
    created_at: "2026-08-20",
    suppression_count: 34,
    last_used: "2 hours ago",
    suppresses_severity: ["medium", "low"],
  },
];

