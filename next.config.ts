import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  allowedDevOrigins: [
    '192.168.0.191',
    ...(process.env.NEXT_PUBLIC_WEBSITE_URL ? [process.env.NEXT_PUBLIC_WEBSITE_URL] : []),
  ],
};

export default nextConfig;
