import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  build: {
    outDir: "dist",
    emptyOutDir: true,
    minify: process.env.NODE_ENV === "production",
    rollupOptions: {
      input: {
        main: resolve(__dirname, "src/main/index.ts"),
        preload: resolve(__dirname, "src/preload/index.ts"),
      },
      output: {
        entryFileNames: (chunkInfo) => {
          if (chunkInfo.name === "main") return "main/index.js";
          if (chunkInfo.name === "preload") return "preload/index.js";
          return "[name].js";
        },
      },
      external: ["electron", "electron-store"],
    },
  },
});
