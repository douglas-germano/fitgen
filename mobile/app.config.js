// Extends app.json. Everything else stays in app.json.
const { withEntitlementsPlist } = require('expo/config-plugins');

/**
 * Free Apple ID ("Personal Team") signing can't provision Push Notifications or Sign in with Apple, and Xcode
 * refuses to sign an app that requests them. `FITGEN_FREE_SIGNING=1 FITGEN_APPLE_TEAM_ID=<team> npx expo run:ios --device` builds without the push entitlement;
 * push registration then fails quietly (see use-push-registration) and the Apple button is hidden.
 * EAS / App Store builds keep both.
 */
const withoutPaidEntitlements = (config) =>
  withEntitlementsPlist(config, (mod) => {
    delete mod.modResults['aps-environment'];
    delete mod.modResults['com.apple.developer.applesignin'];
    return mod;
  });

module.exports = ({ config }) => {
  if (process.env.FITGEN_FREE_SIGNING !== '1') return config;
  return {
    ...config,
    // Signing team for local device builds, e.g. FITGEN_APPLE_TEAM_ID=XXXXXXXXXX (your "Personal Team" in Xcode).
    ios: {
      ...config.ios,
      usesAppleSignIn: false,
      ...(process.env.FITGEN_APPLE_TEAM_ID ? { appleTeamId: process.env.FITGEN_APPLE_TEAM_ID } : {}),
    },
    extra: { ...config.extra, appleSignIn: false },
    // Mods run in reverse order, so listing it first makes it run after expo-notifications / apple-authentication.
    plugins: [withoutPaidEntitlements, ...(config.plugins ?? [])],
  };
};
