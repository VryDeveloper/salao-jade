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
  await page.locator('section[aria-labelledby="h-dia"] a').last().click();
  await expect(page.locator('section[aria-labelledby="h-dia"] a').last()).toHaveAttribute("aria-current", "date");

  const slot = page.locator('section[aria-labelledby="h-hora"] button[aria-pressed="false"]').nth(8);
  const time = await slot.innerText();
  await slot.click();
  await page.getByRole("button", { name: "Mais uma pessoa" }).click();
  await page.mouse.move(0, 0);
  await shoot(page, "agenda");

  await page.getByRole("button", { name: "Confirmar reserva" }).click();
  const status = page.getByRole("status");
  await expect(status).toContainText("Reserva confirmada");
  await expect(status).toContainText(`às ${time} para 3 pessoas`);
  const code = (await status.locator("strong").innerText()).trim();
  await expect(page.getByRole("button", { name: `${time}, ocupado` })).toHaveCount(0); // mesa de dim sum tem capacidade 4

  await page.getByRole("link", { name: "Ver minhas reservas" }).click();
  const item = page.getByRole("listitem").filter({ hasText: code });
  await expect(item).toContainText("Chá & dim sum");
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
