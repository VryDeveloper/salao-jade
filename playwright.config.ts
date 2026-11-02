import { defineConfig, devices } from "@playwright/test";

const PORT = 3200;

export default defineConfig({
  testDir: "e2e",
  // O fluxo usa a mesma conta demo: um teste por vez
  workers: 1,
  use: { baseURL: `http://localhost:${PORT}`, locale: "pt-BR", timezoneId: "America/Sao_Paulo" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `npm run build && npm run start -- -p ${PORT}`,
    url: `http://localhost:${PORT}/entrar`,
    reuseExistingServer: true,
    timeout: 180_000,
  },
});
