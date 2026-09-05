import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: "unit",
          include: ["src/**/*.test.ts"],
          environment: "node",
        },
      },
      {
        test: {
          name: "integration",
          include: ["test/**/*.integration.test.ts"],
          environment: "node",
          // Image pulls and compilation are slow on a cold machine.
          testTimeout: 180_000,
          hookTimeout: 300_000,
          // Containers are a shared, limited resource.
          fileParallelism: false,
        },
      },
    ],
  },
});
