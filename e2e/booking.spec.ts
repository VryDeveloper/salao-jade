// Fluxo completo no navegador. Precisa do banco semeado (conta demo).
// SCREENSHOTS=1 também regrava as imagens do README em docs/screenshots/.
import { expect, test, type Page } from "@playwright/test";

const shoot = async (page: Page, name: string) => {
  if (process.env.SCREENSHOTS) await page.screenshot({ path: `docs/screenshots/${name}.jpg`, quality: 80 });
};

test.use({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });

test("visitante sem sessão vai para o login", async ({ page }) => {
  await page.goto("/agenda");
  await expect(page).toHaveURL(/\/entrar$/);
});

test("entrar, reservar, ver e cancelar", async ({ page }) => {
  await page.goto("/entrar");
  await shoot(page, "entrar");
  await page.getByLabel("E-mail").fill("demo@salaojade.dev");
  await page.getByLabel("Senha").fill("chaverde123");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/agenda$/);

  // Último dia da janela: longe o bastante para ainda poder cancelar (regra das 24h)
  await page.getByRole("link", { name: /Chá & dim sum/ }).click();
  // Cada passo é uma navegação: espera a seleção trocar antes do próximo, senão o link seguinte ainda aponta para a URL antiga
  await expect(page.getByRole("link", { name: /Chá & dim sum/ })).toHaveAttribute("aria-current", "true");
  await page.getByRole("link", { name: "1h30", exact: true }).click();
  await expect(page.getByRole("link", { name: "1h30", exact: true })).toHaveAttribute("aria-current", "true");
  await page.locator('section[aria-labelledby="h-dia"] a').last().click();
  await expect(page.locator('section[aria-labelledby="h-dia"] a').last()).toHaveAttribute("aria-current", "date");

  const slot = page.locator('section[aria-labelledby="h-hora"] button[aria-pressed="false"]').nth(8);
  const time = await slot.innerText();
  await slot.click();
  await page.getByRole("button", { name: "Mais uma pessoa" }).click();
  await page.getByLabel("Acompanhante 1").fill("Ana Lima");
  await page.mouse.move(0, 0);
  await shoot(page, "agenda");

  await page.getByRole("button", { name: "Confirmar reserva" }).click();
  const status = page.getByRole("status");
  await expect(status).toContainText("Reserva confirmada");
  await expect(status).toContainText(time); // o card já mostra o intervalo de 1h30, igual à confirmação
  await expect(status).toContainText(/Sala \d/);
  await expect(status).toContainText("Marina Souza, Ana Lima");
  const code = (await status.getByText(/^JD-/).innerText()).trim();
  // O horário reservado vira "sua reserva" para quem reservou
  await expect(page.getByRole("button", { name: `${time}, conflita com uma reserva sua` })).toBeVisible();

  await page.getByRole("link", { name: "Ver minhas reservas" }).click();
  const item = page.getByRole("listitem").filter({ hasText: code });
  await expect(item).toContainText("Chá & dim sum");
  await expect(item).toContainText("1h30");
  await expect(item).toContainText("Ana Lima");
  await shoot(page, "reservas");

  await item.getByRole("button", { name: /^Cancelar/ }).click();
  await item.getByRole("button", { name: "Sim, cancelar" }).click();
  await expect(page.getByRole("listitem").filter({ hasText: code })).toHaveCount(0);
  await expect(page.getByRole("region", { name: "Histórico" })).toContainText("cancelada");
});

test("agenda no celular", async ({ browser }) => {
  test.skip(!process.env.SCREENSHOTS, "só gera o print do README");
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const page = await context.newPage();
  await page.goto("/entrar");
  await page.getByLabel("E-mail").fill("demo@salaojade.dev");
  await page.getByLabel("Senha").fill("chaverde123");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/agenda$/);
  await page.goto("/agenda?exp=cerimonia-gongfu");
  await expect(page.locator("#h-hora")).toBeVisible();
  await shoot(page, "agenda-mobile");
  await context.close();
});

test("painel do salão: só para admin", async ({ page }) => {
  // Cliente comum não enxerga o painel
  await page.goto("/entrar");
  await page.getByLabel("E-mail").fill("demo@salaojade.dev");
  await page.getByLabel("Senha").fill("chaverde123");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/agenda$/);
  await expect(page.getByRole("link", { name: "Painel do salão" })).toHaveCount(0);
  await page.goto("/admin");
  await expect(page.getByText("Página não encontrada")).toBeVisible();

  // A conta do salão cai direto no painel (a página 404 não tem cabeçalho: sai pela agenda)
  await page.goto("/agenda");
  await page.getByRole("button", { name: "Sair" }).click();
  await page.getByLabel("E-mail").fill("admin@salaojade.dev");
  await page.getByLabel("Senha").fill("jade-admin-2026");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByText("Reservas hoje")).toBeVisible();
  await page.getByRole("link", { name: "Clientes" }).click();
  await expect(page.getByRole("table")).toContainText("demo@salaojade.dev");
  await page.getByRole("link", { name: "Funcionamento" }).click();
  await expect(page.getByRole("heading", { name: "Folgas e feriados" })).toBeVisible();
});

test("cliques rápidos na agenda não desfazem o passo anterior", async ({ page }) => {
  await page.goto("/entrar");
  await page.getByLabel("E-mail").fill("demo@salaojade.dev");
  await page.getByLabel("Senha").fill("chaverde123");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/agenda$/);
  await page.locator('section[aria-labelledby="h-hora"]').waitFor();

  // Três escolhas seguidas, sem esperar a página trocar entre elas
  const lastDay = page.locator('section[aria-labelledby="h-dia"] a').last();
  const lastDate = new URL((await lastDay.getAttribute("href"))!, "http://x").searchParams.get("dia");
  await page.getByRole("link", { name: /Mesa de chá/ }).click();
  await page.getByRole("link", { name: "2 h", exact: true }).click();
  await lastDay.click();

  await expect(page).toHaveURL(new RegExp(`exp=mesa-de-cha.*dur=120.*dia=${lastDate}`));
  await expect(page.getByRole("link", { name: /Mesa de chá/ })).toHaveAttribute("aria-current", "true");
  await expect(page.getByRole("link", { name: "2 h", exact: true })).toHaveAttribute("aria-current", "true");
  await expect(page.locator('section[aria-labelledby="h-dia"] a').last()).toHaveAttribute("aria-current", "date");
});
