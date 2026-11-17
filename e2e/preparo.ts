import { expect, test as preparar } from "@playwright/test";
import { ARQUIVO_DA_SESSAO } from "./sessao";
import { cadastrarContaFicticia } from "./apoio";

// Roda uma vez antes das três larguras: cria uma conta fictícia e guarda a sessão.
preparar("cria a conta fictícia dos testes", async ({ page }) => {
  await cadastrarContaFicticia(page);
  await expect(page).toHaveURL(/\/painel$/);
  await page.context().storageState({ path: ARQUIVO_DA_SESSAO });
});
