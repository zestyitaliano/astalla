import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    typedRoutes: true,
    outputFileTracingRoot: path.join(__dirname, "../..")
  },
  env: {
    DEV_MOCKS: process.env.DEV_MOCKS ?? "false"
  }
};

export default nextConfig;
