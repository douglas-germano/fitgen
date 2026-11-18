// Sentry's Expo config adds debug IDs to bundles so uploaded source maps match the crash stack traces.
const { getSentryExpoConfig } = require('@sentry/react-native/metro');

module.exports = getSentryExpoConfig(__dirname);
