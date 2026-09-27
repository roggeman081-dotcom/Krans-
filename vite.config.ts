import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { nitro } from "nitro/vite";

export default defineConfig({
  base: process.env.GITHUB_ACTIONS ? "/Krans-/" : "/",
  resolve: {
    tsconfigPaths: true,
  },
  plugins: [
    tanstackStart({
      spa: {
        enabled: true,
      },
    }),
    nitro({
      preset: process.env.GITHUB_ACTIONS ? "static" : "node",
    }),
    viteReact(),
    tailwindcss(),
  ],
});
