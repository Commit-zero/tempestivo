import { expect, test } from "@playwright/test";
import { cadastrarContaFicticia, semRolagemHorizontal } from "./apoio";

// Conta própria: o link da agenda e a margem não podem ser disputados pelas três larguras.
test.use({ storageState: { cookies: [], origins: [] } });

test("meta interna e agenda assinável: ajusta a margem, cria, troca e desliga o link", async ({ page, request }) => {
  await cadastrarContaFicticia(page);
  await page.goto("/conta");
  await semRolagemHorizontal(page);

  await page.getByLabel("Meta interna: dias úteis antes do vencimento").fill("3");
  await page.getByRole("button", { name: "Salvar a margem" }).click();
  await expect(page.getByRole("main").getByRole("status").filter({ hasText: "Margem salva" })).toBeVisible();

  await page.getByRole("button", { name: "Criar o link da agenda" }).click();
  const campo = page.getByLabel("Link da agenda");
  await expect(campo).toBeVisible();
  const link = await campo.inputValue();
  expect(link).toMatch(/\/agenda\/[A-Za-z0-9_-]{40,}\/calendario\.ics$/);
  await expect(page.getByRole("link", { name: "assinar com um toque" })).toHaveAttribute("href", /^webcal:\/\//);
  await semRolagemHorizontal(page);

  const caminho = new URL(link).pathname;
  // Como um app de calendário, que baixa o feed horas depois: conexão nova a cada vez.
  // Reaproveitar a conexão depois das ações na tela (mais de 5 s) cairia num socket que
  // o servidor já fechou por inatividade (ECONNRESET).
  const baixarFeed = () => request.get(caminho, { headers: { connection: "close" } });
  const feed = await baixarFeed();
  expect(feed.status()).toBe(200);
  expect(feed.headers()["content-type"]).toContain("text/calendar");
  expect(await feed.text()).toContain("X-WR-CALNAME:Tempestivo: prazos e audiências");

  // Trocar o link desliga o anterior.
  await page.reload();
  await page.getByRole("button", { name: "Trocar o link" }).click();
  // Trocar desliga o link anterior: cancelar mantém o que existe.
  await expect(page.getByRole("alertdialog")).toContainText("O link atual deixa de funcionar");
  await page.getByRole("alertdialog").getByRole("button", { name: "Cancelar" }).click();
  expect((await baixarFeed()).status()).toBe(200);
  await page.getByRole("button", { name: "Trocar o link" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Trocar o link" }).click();
  await expect(page.getByLabel("Link da agenda")).toBeVisible();
  expect((await baixarFeed()).status()).toBe(404);

  // Sem recarregar: desligar tem de tirar da tela o link que deixou de funcionar.
  await page.getByRole("button", { name: "Desligar a agenda" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Desligar a agenda" }).click();
  await expect(page.getByRole("main").getByRole("status").filter({ hasText: "Agenda desligada" })).toBeVisible();
  await expect(page.getByLabel("Link da agenda")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Desligar a agenda" })).toHaveCount(0);

  // Criar de novo: o aviso de desligada sai, e o bloco do link novo recebe o foco.
  await page.getByRole("button", { name: "Criar o link da agenda" }).click();
  await expect(page.getByLabel("Link da agenda")).toBeVisible();
  await expect(page.getByTestId("link-novo-da-agenda")).toBeFocused();
  await expect(page.getByText("Agenda desligada.")).toHaveCount(0);
});

test("link de agenda inválido responde 404 sem revelar nada", async ({ request }) => {
  const resposta = await request.get("/agenda/link-que-nao-existe-0123456789abcdef/calendario.ics");

  expect(resposta.status()).toBe(404);
  expect(await resposta.text()).toBe("Agenda não encontrada.");
});
