"""Unit tests for providers package (AC-081, AC-084, AC-085, AC-102)."""
import asyncio
import unittest
from quorum_providers.adaptive import RouteSignals, route
from quorum_providers.local import LocalStubProvider
from quorum_providers.route_plan import RoutePlan, RoutePlanStore
from quorum_providers.routing import ModelTier, RoutingPolicy


class ProviderUnitTests(unittest.TestCase):

    def test_provider_abstraction_ac_081(self):
        """AC-081: Alternative provider routes designated node without modifying templates."""
        provider = LocalStubProvider()
        res = asyncio.run(
            provider.generate(
                system_prompt="You are a reviewer",
                user_prompt="Review this code",
                model="custom-model-x",
            )
        )
        self.assertEqual(res.model, "custom-model-x")
        self.assertEqual(res.provider, "local")
        self.assertEqual(len(provider.calls_made), 1)

    def test_adaptive_escalation_and_floors_ac_084(self):
        """AC-084: Ambiguous confidence [0.35, 0.70] triggers escalation, security floor respected."""
        policy = RoutingPolicy(enable_adaptive_escalation=True, max_escalations_per_run=3)

        # 1. Ambiguous confidence on critical severity triggers Tier 3 escalation
        sig_ambiguous = RouteSignals(
            node_class="lane.correctness",
            confidence=0.55,  # In [0.35, 0.70]
            severity="critical",
            prior_escalations_in_run=0,
        )
        sel_ambiguous = route(sig_ambiguous, policy)
        self.assertTrue(sel_ambiguous.escalated)
        self.assertEqual(sel_ambiguous.tier, ModelTier.TIER_3_STRONG)
        self.assertEqual(sel_ambiguous.reason, "escalation_ambiguous_confidence")

        # 2. Clear confidence (0.95) does not escalate
        sig_clear = RouteSignals(
            node_class="lane.correctness",
            confidence=0.95,
            severity="critical",
            prior_escalations_in_run=0,
        )
        sel_clear = route(sig_clear, policy)
        self.assertFalse(sel_clear.escalated)
        self.assertEqual(sel_clear.tier, ModelTier.TIER_2_STANDARD)

        # 3. Security lane floor: must never run on Tier 1
        sig_security = RouteSignals(
            node_class="lane.security",
            prior_escalations_in_run=0,
        )
        sel_security = route(sig_security, policy)
        self.assertGreaterEqual(sel_security.tier, ModelTier.TIER_2_STANDARD)

        # 4. Ceiling: after 3 escalations, further ambiguous findings do not escalate
        sig_capped = RouteSignals(
            node_class="lane.correctness",
            confidence=0.50,
            severity="critical",
            prior_escalations_in_run=3,  # Run budget exhausted!
        )
        sel_capped = route(sig_capped, policy)
        self.assertFalse(sel_capped.escalated)
        self.assertEqual(sel_capped.tier, ModelTier.TIER_2_STANDARD)

    def test_route_plan_recording_and_replay_ac_085_and_ac_102(self):
        """AC-085 & AC-102: Route plan recorded and replayed identically on re-runs."""
        store = RoutePlanStore()
        plan = RoutePlan(run_key="repo:1:sha1:v1:v1")

        policy = RoutingPolicy()
        sel = route(RouteSignals(node_class="lane.correctness"), policy)
        plan.record("lane.correctness", sel)
        store.save(plan)

        retrieved_plan = store.get("repo:1:sha1:v1:v1")
        self.assertIsNotNone(retrieved_plan)
        saved_route = retrieved_plan.get_selection("lane.correctness")
        self.assertEqual(saved_route["model"], sel.model)
        self.assertEqual(saved_route["tier"], int(sel.tier))


if __name__ == "__main__":
    unittest.main()
