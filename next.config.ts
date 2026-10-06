import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
const nextConfig: NextConfig = {
  output: "standalone",
  distDir:
    process.env.MARKETPLACE_INTEGRATION === "true"
      ? ".next-integration"
      : ".next",
  images: {
    dangerouslyAllowLocalIP: process.env.MARKETPLACE_INTEGRATION === "true",
    remotePatterns: process.env.S3_PUBLIC_URL
      ? [
          {
            protocol:
              new URL(process.env.S3_PUBLIC_URL).protocol === "http:"
                ? "http"
                : "https",
            hostname: new URL(process.env.S3_PUBLIC_URL).hostname,
            port: new URL(process.env.S3_PUBLIC_URL).port,
            pathname: "/**",
          },
        ]
      : [],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};
export default createNextIntlPlugin("./src/i18n/request.ts")(nextConfig);
