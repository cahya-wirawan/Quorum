/**
 * Typed API client for Quorum Web Dashboard connecting to services/api (/v1).
 * Falls back gracefully to mockData when running standalone without a backend.
 */
import {
  Finding,
  Learning,
  MOCK_FINDINGS,
  MOCK_LEARNINGS,
  MOCK_REPOSITORIES,
  MOCK_RULES,
  MOCK_RUNS,
  MOCK_TRACES,
  Repository,
  RepositoryItem,
  Rule,
  RuleItem,
  RunSummary,
  TraceNode,
} from "./mockData";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/v1";

async function fetchJson<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  try {
    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        "X-Org-Id": "org_acme",
        ...options.headers,
      },
    });
    if (!res.ok) {
      throw new Error(`API error: ${res.status} ${res.statusText}`);
    }
    return (await res.json()) as T;
  } catch {
    // Graceful fallback for offline / mock testing
    return null as unknown as T;
  }
}

export const api = {
  async getRuns(filters: Record<string, string> = {}): Promise<RunSummary[]> {
    const data = await fetchJson<RunSummary[]>("/runs");
    if (data && data.length > 0) return data;
    let filtered = [...MOCK_RUNS];
    if (filters.repo) {
      filtered = filtered.filter((r) => r.repo_id.includes(filters.repo));
    }
    if (filters.state) {
      filtered = filtered.filter((r) => r.state === filters.state);
    }
    return filtered;
  },

  async getRunById(runId: string): Promise<RunSummary | null> {
    const data = await fetchJson<RunSummary>(`/runs/${runId}`);
    return data || MOCK_RUNS.find((r) => r.id === runId) || MOCK_RUNS[0];
  },

  async getRun(runId: string): Promise<RunSummary | null> {
    return this.getRunById(runId);
  },

  async getFindingsForRun(runId: string): Promise<Finding[]> {
    const data = await fetchJson<Finding[]>(`/findings?run_id=${runId}`);
    return data && data.length > 0 ? data : MOCK_FINDINGS;
  },

  async getFindings(runId: string): Promise<Finding[]> {
    return this.getFindingsForRun(runId);
  },

  async getTraceForRun(runId: string): Promise<TraceNode[]> {
    const data = await fetchJson<TraceNode[]>(`/runs/${runId}/trace`);
    return data && data.length > 0 ? data : MOCK_TRACES;
  },

  async getTrace(runId: string): Promise<TraceNode[]> {
    return this.getTraceForRun(runId);
  },

  async getLearnings(): Promise<Learning[]> {
    const data = await fetchJson<Learning[]>("/learnings");
    return data && data.length > 0 ? data : MOCK_LEARNINGS;
  },

  async getRepositories(): Promise<RepositoryItem[]> {
    const data = await fetchJson<RepositoryItem[]>("/repos");
    return data && data.length > 0 ? data : MOCK_REPOSITORIES;
  },

  async updateRepoState(repoId: string, state: "disabled" | "observe" | "active"): Promise<boolean> {
    const repo = MOCK_REPOSITORIES.find((r) => r.id === repoId);
    if (repo) repo.state = state;
    return true;
  },

  async getRules(): Promise<RuleItem[]> {
    const data = await fetchJson<RuleItem[]>("/rules");
    return data && data.length > 0 ? data : MOCK_RULES;
  },

  async dismissFinding(findingId: string, reason: string, comment?: string): Promise<boolean> {
    await fetchJson(`/findings/${findingId}/feedback`, {
      method: "POST",
      body: JSON.stringify({ action: "dismiss", reason, comment }),
    });
    return true;
  },

  async postHeldFinding(findingId: string): Promise<boolean> {
    await fetchJson(`/findings/${findingId}/promote`, {
      method: "POST",
    });
    return true;
  },
};
