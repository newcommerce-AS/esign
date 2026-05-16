import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdfkit", "twilio", "@electric-sql/pglite"],
};

export default nextConfig;
