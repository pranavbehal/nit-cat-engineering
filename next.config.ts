import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    serverComponentsExternalPackages: ["@supabase/auth-helpers-nextjs"],
  },
};

export default nextConfig;
