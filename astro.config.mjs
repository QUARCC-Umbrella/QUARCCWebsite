import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";

export default defineConfig({
  output: "static",
  // The repo's assets live in `Public/` (created on a case-insensitive
  // filesystem). Point Astro at it so Linux builds copy them too.
  publicDir: "Public",
  integrations: [react()],
  markdown: {
    remarkPlugins: [remarkMath],
    rehypePlugins: [rehypeKatex],
  },
});
