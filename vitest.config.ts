import { fileURLToPath } from "node:url";
import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: {
    exclude: [...configDefaults.exclude, "e2e/**"], // e2e é do Playwright
    // Os testes de banco dividem o mesmo Postgres (ex.: o do painel desativa uma sala por um instante)
    fileParallelism: false,
  },
});
