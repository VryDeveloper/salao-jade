import { defineConfig, devices } from "@playwright/test";

const PORT = 3200;
// E2E_BASE_URL=https://salao-jade.vercel.app roda contra o site publicado, sem buildar nada local
const remote = process.env.E2E_BASE_URL;

export default defineConfig({
  testDir: "e2e",
  // O fluxo usa a mesma conta demo: um teste por vez
  workers: 1,
  use: { baseURL: remote ?? `http://localhost:${PORT}`, locale: "pt-BR", timezoneId: "America/Sao_Paulo" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: remote
    ? undefined
    : {
        command: `npm run build && npm run start -- -p ${PORT}`,
        url: `http://localhost:${PORT}/entrar`,
        reuseExistingServer: true,
        timeout: 180_000,
        env: { NEXT_DIST_DIR: ".next-e2e" },
      },
});
