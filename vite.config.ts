import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  // Relative base so the build works under the GitHub Pages subpath
  // (https://<user>.github.io/commander-playtester/) as well as at root.
  base: "./",
  plugins: [react()],
  test: {
    globals: true,
    environment: "node",
  },
});
