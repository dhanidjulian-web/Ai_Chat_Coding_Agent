import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

// Exported from AppMint AI Studio. base "./" keeps every asset path relative, so the same dist/
// works on any web host and inside the AppMint Android shell (mounted at /assets/www/).
export default defineConfig({
  base: "./",
  plugins: [react(), tailwindcss()],
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  build: { target: "es2017", outDir: "dist", emptyOutDir: true },
});
