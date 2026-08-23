import { defineConfig } from "vitest/config";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    environment: "node",
    include: ["__tests__/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "server-only": path.resolve(dirname, "__tests__/stubs/server-only.ts"),
      "@": path.resolve(dirname, "."),
    },
  },
});
