/**
 * next.config.js
 * Optional bundle analyzer integration. Enable by setting ANALYZE=true
 * and installing `@next/bundle-analyzer` as a dev dependency locally.
 */
/* eslint-disable @typescript-eslint/no-require-imports */
const baseConfig = require("./next.config.ts").default;

try {
  const withBundleAnalyzer = require("@next/bundle-analyzer")({
    enabled: process.env.ANALYZE === "true",
  });
  module.exports = withBundleAnalyzer(baseConfig);
} catch {
  // If bundle-analyzer isn't installed, fall back to base config.
  module.exports = baseConfig;
}
