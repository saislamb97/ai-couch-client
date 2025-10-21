import { defineConfig } from "vite";
import path from "path";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },

  server: {
    port: 3000,
    open: true,
    host: true,
    cors: true,
    proxy: {
      "/api": {
        target: process.env.VITE_API_BASE_URL || "http://localhost:8000",
        changeOrigin: true,
        secure: false,
      },
    },
  },

  build: {
    outDir: path.resolve(__dirname, "../app/assets/client"),
    emptyOutDir: true,
    chunkSizeWarningLimit: 5000,
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, "index.html"),
      },
      output: {
        // ✅ Fixed filenames (no hashes)
        entryFileNames: "aicoach.js",
        chunkFileNames: "aicoach-[name].js",
        assetFileNames: (assetInfo) => {
          const ext = path.extname(assetInfo.name ?? "");
          // e.g. aicoach.css, aicoach.svg, aicoach.png
          return `aicoach${ext}`;
        },
      },
    },
  },
});
