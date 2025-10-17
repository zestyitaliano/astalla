import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: [
      "lib/references/__tests__/humanize.test.ts",
      "lib/references/__tests__/parser.test.ts",
    ],
    globals: true,
    environment: "node",
  },
});
