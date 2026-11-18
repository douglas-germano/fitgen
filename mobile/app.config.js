// Extends app.json. Everything else stays in app.json.
const { withEntitlementsPlist } = require('expo/config-plugins');

/**
 * Free Apple ID ("Personal Team") signing can't provision Push Notifications, and Xcode refuses to sign an app
 * that requests them. `FITGEN_FREE_SIGNING=1 FITGEN_APPLE_TEAM_ID=<team> npx expo run:ios --device` builds without the push entitlement;
 * push registration then fails quietly (see use-push-registration). EAS / App Store builds keep push.
 */
const withoutPushEntitlement = (config) =>
  withEntitlementsPlist(config, (mod) => {
    delete mod.modResults['aps-environment'];
    return mod;
  });

module.exports = ({ config }) => {
  if (process.env.FITGEN_FREE_SIGNING !== '1') return config;
  return {
    ...config,
    // Signing team for local device builds, e.g. FITGEN_APPLE_TEAM_ID=XXXXXXXXXX (your "Personal Team" in Xcode).
    ios: { ...config.ios, ...(process.env.FITGEN_APPLE_TEAM_ID ? { appleTeamId: process.env.FITGEN_APPLE_TEAM_ID } : {}) },
    // Mods run in reverse order, so listing it first makes it run after expo-notifications.
    plugins: [withoutPushEntitlement, ...(config.plugins ?? [])],
  };
};
