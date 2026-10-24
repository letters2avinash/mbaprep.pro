import path from "node:path";
import type { NextConfig } from "next";
import { config as loadEnv } from "dotenv";

// Real secrets live in private/config.env (git-ignored). Next.js only reads
// .env* files, so load this one explicitly. Values already set in the
// environment win, so hosted builds are unaffected.
loadEnv({ path: "private/config.env", quiet: true });

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    root: path.resolve(process.cwd()),
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
