import type { NextConfig } from "next";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const withPWA = require("next-pwa")({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
  runtimeCaching: [
    {
      // Auth responses (login/refresh/logout) must never be served stale
      // from the service worker cache.
      urlPattern: /^https:\/\/api\.hifz\.uz\/api\/auth\/.*/,
      handler: "NetworkOnly",
    },
    {
      urlPattern: /^https:\/\/api\.hifz\.uz\/.*/,
      handler: "NetworkFirst",
      options: {
        cacheName: "hifz-api",
        expiration: { maxEntries: 100, maxAgeSeconds: 60 * 5 },
        networkTimeoutSeconds: 10,
      },
    },
  ],
});

const nextConfig: NextConfig = {
  turbopack: {},
  async redirects() {
    // The page used to live at /companion-test while it was being built.
    return [{ source: '/companion-test', destination: '/memorize', permanent: true }];
  },
};

export default withPWA(nextConfig);
