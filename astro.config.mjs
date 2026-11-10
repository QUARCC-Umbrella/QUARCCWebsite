import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeTrailingSlash from "./src/lib/rehypeTrailingSlash.mjs";

export default defineConfig({
  // Canonical origin (quarcc.com redirects here). Used for canonical URLs, the sitemap and schema.
  site: "https://www.quarcc.com",
  output: "static",
  // Pages build to /path/index.html and are linked as /path/ (the host 301s "/path" to "/path/").
  build: { format: "directory" },
  // The repo's assets live in `Public/` (created on a case-insensitive
  // filesystem). Point Astro at it so Linux builds copy them too.
  publicDir: "Public",
  integrations: [react()],
  markdown: {
    remarkPlugins: [remarkMath],
    rehypePlugins: [rehypeKatex, rehypeTrailingSlash],
  },
});
