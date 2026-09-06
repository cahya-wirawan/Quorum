"""Unit tests for Quorum Graph package."""
import asyncio
import unittest
from quorum_core.models import (
    DiffFile,
    DiffSummary,
    Evidence,
    EvidenceClass,
    Finding,
    FindingCategory,
    FindingStatus,
    Policy,
    RepoConfig,
    Severity,
    SourceType,
    TriageDecision,
    TriageMode,
    VerificationVerdict,
)
from quorum_core.ranking import is_eligible_for_publication
from quorum_graph.nodes.triage import triage_node
from quorum_graph.nodes.verify import verify_finding
from quorum_graph.tools import VerifierTools
from quorum_indexing.search import HybridCodeSearch
from quorum_providers.local import LocalStubProvider


class GraphUnitTests(unittest.TestCase):

    def test_mandatory_adversarial_verification_ac_030(self):
        """AC-030: Verification is mandatory. Unread tools force unprovable."""
        search = HybridCodeSearch()
        search.add_file("app.py", "def run():\n    pass\n")
        tools = VerifierTools(search)

        provider = LocalStubProvider()
        # Mock verifier response that tries to confirm without tool inspection
        provider.set_response_for_node("adversarial verifier", {
            "verdict": "confirmed",
            "refutation_hypothesis": "Nothing guarded",
            "tools_called": [],  # Empty!
            "reasoning": "Model guess",
        })

        finding = Finding(
            id="f1",
            fingerprint="fp1",
            title="Candidate bug",
            claim="Null pointer",
            severity=Severity.HIGH,
            category=FindingCategory.CORRECTNESS,
            path="app.py",
            line_start=1,
            line_end=2,
            status=FindingStatus.CANDIDATE,
        )

        # Clear tools call history to simulate no tool called
        tools.call_history.clear()
        
        # Override tools.read_file to do nothing to test forced unprovable
        original_read = tools.read_file
        tools.read_file = lambda *args, **kwargs: ""
        try:
            ver = asyncio.run(verify_finding(finding, "diff", tools, provider))
            # AC-030: Because no read tools were recorded in tools_called, verdict is forced to UNPROVABLE
            self.assertEqual(ver.verdict, VerificationVerdict.UNPROVABLE)
            self.assertEqual(finding.status, FindingStatus.UNPROVABLE)
        finally:
            tools.read_file = original_read

    def test_evidence_gating_ac_031(self):
        """AC-031: Finding whose only evidence is heuristic cannot be published."""
        ev_heuristic = Evidence(
            id="ev_h",
            evidence_class=EvidenceClass.HEURISTIC,
            source_type=SourceType.HEURISTIC,
            path="app.py",
            line_start=1,
            line_end=2,
            content_snippet="heuristic guess",
        )
        finding_heuristic = Finding(
            id="f_heur",
            fingerprint="fp_h",
            title="Heuristic issue",
            claim="Might be slow",
            severity=Severity.MEDIUM,
            category=FindingCategory.CORRECTNESS,
            path="app.py",
            line_start=1,
            line_end=2,
            status=FindingStatus.CONFIRMED,
            evidences=[ev_heuristic],
        )

        self.assertFalse(is_eligible_for_publication(finding_heuristic))

        # Adding concrete evidence makes it eligible
        ev_concrete = Evidence(
            id="ev_c",
            evidence_class=EvidenceClass.VERIFIED,
            source_type=SourceType.STATIC_TOOL,
            path="app.py",
            line_start=1,
            line_end=2,
            content_snippet="concrete trace",
        )
        finding_heuristic.evidences.append(ev_concrete)
        self.assertTrue(is_eligible_for_publication(finding_heuristic))

    def test_triage_lockfile_skip_and_sensitive_guard_ac_014(self):
        """AC-014: Only package-lock.json skips; sensitive paths never skip."""
        provider = LocalStubProvider()
        policy = Policy(sensitive_paths=["security/"])

        # 1. Lockfile only -> skip
        state_lockfile = {
            "diff": DiffSummary(files=[DiffFile(path="package-lock.json")]),
            "policy": policy,
            "pr_meta": type("PRMetaObj", (), {"title": "Update deps", "body": "bumps"})(),
        }
        res_skip = asyncio.run(triage_node(state_lockfile, provider))
        self.assertEqual(res_skip["triage"].mode, TriageMode.SKIP)

        # 2. Lockfile + sensitive path -> NEVER skip
        state_sensitive = {
            "diff": DiffSummary(files=[DiffFile(path="package-lock.json"), DiffFile(path="security/keys.py")]),
            "policy": policy,
            "pr_meta": type("PRMetaObj", (), {"title": "Update deps and keys", "body": "bumps"})(),
        }
        res_full = asyncio.run(triage_node(state_sensitive, provider))
        self.assertEqual(res_full["triage"].mode, TriageMode.FULL)


if __name__ == "__main__":
    unittest.main()
