// @lovable.dev/vite-tanstack-config already includes the core plugins.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  vite: {
    base: process.env.GITHUB_ACTIONS ? "/Krans-/" : "/",
  },
  tanstackStart: {
    server: { entry: "server" },
  },
  nitro: {
    preset: process.env.GITHUB_ACTIONS ? "github-pages" : "cloudflare",
  },
});
