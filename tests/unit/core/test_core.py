"""Unit tests for Quorum Core package."""
import unittest
from quorum_core.models import (
    Evidence,
    EvidenceClass,
    Finding,
    FindingCategory,
    FindingStatus,
    Policy,
    RepoConfig,
    Severity,
    SourceType,
    Suppression,
)
from quorum_core.fingerprint import compute_fingerprint
from quorum_core.ranking import apply_comment_budget, calculate_rank_score
from quorum_core.policy import evaluate_policy, check_sensitive_paths
from quorum_core.suppression import evaluate_suppressions
from quorum_core.config_merge import merge_config


class CoreUnitTests(unittest.TestCase):

    def test_fingerprint_stability(self):
        """Fingerprint must be line-shift and comment stable."""
        code_1 = "def auth():\n    # check token\n    token = req.headers.get('auth')\n    return token"
        code_2 = "\n\n\ndef auth():\n    token = req.headers.get('auth')\n    # different comment\n    return token\n"

        fp1 = compute_fingerprint("auth.py", "security", "Missing token validation", code_1)
        fp2 = compute_fingerprint("auth.py", "security", "Missing token validation", code_2)

        self.assertEqual(fp1, fp2)

    def test_comment_budget_and_style_exclusion_ac_032(self):
        """AC-032: Budget of 8, style advisory findings never consume budget."""
        findings = []
        # Create 20 confirmed correctness findings
        for i in range(20):
            ev = Evidence(
                id=f"ev_{i}",
                evidence_class=EvidenceClass.STRONGLY_INFERRED,
                source_type=SourceType.STATIC_TOOL,
                path=f"file_{i}.py",
                line_start=10,
                line_end=15,
                content_snippet="broken code",
            )
            f = Finding(
                id=f"f_{i}",
                fingerprint=f"fp_{i}",
                title=f"Bug {i}",
                claim=f"Claim {i}",
                severity=Severity.HIGH if i < 10 else Severity.MEDIUM,
                category=FindingCategory.CORRECTNESS,
                path=f"file_{i}.py",
                line_start=10,
                line_end=15,
                status=FindingStatus.CONFIRMED,
                evidences=[ev],
                confidence=0.8,
            )
            findings.append(f)

        # Add 3 advisory style findings
        for j in range(3):
            ev = Evidence(
                id=f"ev_style_{j}",
                evidence_class=EvidenceClass.STRONGLY_INFERRED,
                source_type=SourceType.STATIC_TOOL,
                path="style.py",
                line_start=1,
                line_end=2,
                content_snippet="style",
            )
            f = Finding(
                id=f"style_{j}",
                fingerprint=f"fp_style_{j}",
                title=f"Style {j}",
                claim=f"Line too long {j}",
                severity=Severity.LOW,
                category=FindingCategory.STYLE,
                path="style.py",
                line_start=1,
                line_end=2,
                status=FindingStatus.CONFIRMED,
                evidences=[ev],
                confidence=0.95,
            )
            findings.append(f)

        policy = Policy()
        publishable, held = apply_comment_budget(findings, budget=8, policy=policy)

        # Exactly 8 publishable comments allocated
        self.assertEqual(len(publishable), 8)
        for p in publishable:
            self.assertEqual(p.status, FindingStatus.PUBLISHED)
            # Style findings must NEVER consume inline comment budget
            self.assertNotEqual(p.category, FindingCategory.STYLE)

        # Remaining 12 correctness + 3 style findings = 15 held
        self.assertEqual(len(held), 15)
        for h in held:
            self.assertEqual(h.status, FindingStatus.HELD)

    def test_suppression_evaluation_ac_034_and_ac_061(self):
        """AC-034: Dismissed findings are suppressed. AC-061: Critical requires valid reason."""
        f1 = Finding(
            id="f1",
            fingerprint="fp_normal",
            title="Normal bug",
            claim="Null pointer",
            severity=Severity.MEDIUM,
            category=FindingCategory.CORRECTNESS,
            path="main.py",
            line_start=5,
            line_end=6,
            status=FindingStatus.CONFIRMED,
        )
        f2 = Finding(
            id="f2",
            fingerprint="fp_crit",
            title="Critical SQL Injection",
            claim="Raw query concatenation",
            severity=Severity.CRITICAL,
            category=FindingCategory.SECURITY,
            path="db.py",
            line_start=20,
            line_end=22,
            status=FindingStatus.CONFIRMED,
        )

        suppressions = [
            Suppression(id="s1", org_id="o1", repo_id="r1", fingerprint="fp_normal", reason="intended"),
            Suppression(id="s2", org_id="o1", repo_id="r1", fingerprint="fp_crit", reason=""),  # empty reason!
        ]

        active, suppressed = evaluate_suppressions([f1, f2], suppressions)

        # f1 is successfully suppressed
        self.assertIn(f1, suppressed)
        self.assertEqual(f1.status, FindingStatus.SUPPRESSED)

        # f2 is CRITICAL with empty reason -> AC-061: cannot be silently suppressed without valid typed reason
        self.assertIn(f2, active)
        self.assertNotEqual(f2.status, FindingStatus.SUPPRESSED)

    def test_config_merge_hierarchy_ac_005(self):
        """AC-005: Precedence default -> org -> ui -> file (.quorum.yaml). Fallback on invalid."""
        default_cfg = RepoConfig(comment_budget=10, mode="full")
        org_cfg = {"comment_budget": 8}
        ui_cfg = {"comment_budget": 7}
        file_cfg = {"comment_budget": 5}

        # 1. file overrides UI overrides org overrides default
        resolved, warning = merge_config(default_cfg, org_cfg, ui_cfg, file_cfg)
        self.assertEqual(resolved.comment_budget, 5)
        self.assertEqual(resolved.source, "file")
        self.assertIsNone(warning)

        # 2. Invalid file config falls back to last known good (or UI) with warning
        invalid_file = {"comment_budget": -10}  # Invalid negative budget!
        resolved_fallback, warn = merge_config(default_cfg, org_cfg, ui_cfg, invalid_file, last_known_good=resolved)
        self.assertEqual(resolved_fallback.comment_budget, 5)
        self.assertIsNotNone(warn)
        self.assertIn("Invalid .quorum.yaml", warn)

    def test_policy_sensitive_paths_and_blocking(self):
        """Sensitive paths detection and critical blocking."""
        policy = Policy(block_on_critical=True, sensitive_paths=[".github/", "auth/"])
        files = ["src/main.py", "auth/jwt.py"]

        touched = check_sensitive_paths(files, policy)
        self.assertEqual(touched, ["auth/jwt.py"])

        # Critical finding causes is_blocked = True
        crit = Finding(
            id="fc",
            fingerprint="fpc",
            title="RCE",
            claim="Code execution",
            severity=Severity.CRITICAL,
            category=FindingCategory.SECURITY,
            path="auth/jwt.py",
            line_start=1,
            line_end=2,
            status=FindingStatus.CONFIRMED,
        )
        res = evaluate_policy([crit], policy, RepoConfig(mode="full"), changed_files=files)
        self.assertTrue(res.is_blocked)


if __name__ == "__main__":
    unittest.main()
