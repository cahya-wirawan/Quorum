import GuidedFirstReviewPage from "../../(dash)/repos/[id]/trial/page";

export default function OnboardingTrialPage() {
  const dummyParams = Promise.resolve({ id: "acme/payment-gateway" });
  return (
    <div style={{ padding: "var(--q-6)", maxWidth: "var(--q-max-content)", margin: "0 auto" }}>
      <GuidedFirstReviewPage params={dummyParams} />
    </div>
  );
}
