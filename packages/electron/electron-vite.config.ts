import { resolve } from "path";
import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
  },
  renderer: {
    resolve: {
      alias: {
        "@": resolve("src/renderer"),
        "@opennative/shared": resolve("../shared/src/index.ts"),
      },
    },
    css: {
      postcss: {
        plugins: [
          require("tailwindcss"),
          require("autoprefixer"),
        ],
      },
    },
    plugins: [react()],
  },
});
