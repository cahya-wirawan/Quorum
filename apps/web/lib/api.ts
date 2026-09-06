export async function fetchRun(orgId: string, runId: string) {
  const res = await fetch(`/api/v1/runs/${runId}`, {
    headers: { "X-Org-Id": orgId },
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch run: ${res.statusText}`);
  }
  return res.json();
}
