// iOS trials are part of the eligible annual offer, never a user toggle.
export const resolvePaywallTrialEnabled = ({ platform, plan, trialEnabled = false } = {}) =>
  plan?.id === "yearly" &&
  (platform !== "ios" || plan?.available !== false) &&
  plan?.hasTrial === true &&
  (platform === "ios" || trialEnabled === true);

export const resolvePaywallPurchaseOffer = (options = {}) => {
  const trialEnabled = resolvePaywallTrialEnabled(options);
  return {
    trialEnabled,
    // Do not silently charge the paid package if the advertised trial is missing.
    package: (trialEnabled ? options.plan?.trialPackage : options.plan?.package) || null,
  };
};
