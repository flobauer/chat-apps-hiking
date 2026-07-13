import path from "node:path";
import { fileURLToPath } from "node:url";

import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { skybridge } from "skybridge/vite";
import { defineConfig, type PluginOption } from "vite";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));
const viewsDir = path.resolve(projectRoot, "web/src/widgets");

export default defineConfig({
  plugins: [
    skybridge({ viewsDir }) as PluginOption,
    react(),
    tailwindcss(),
  ],
  publicDir: path.resolve(projectRoot, "assets"),
  resolve: {
    alias: {
      "@": path.resolve(projectRoot, "web/src"),
    },
  },
});
