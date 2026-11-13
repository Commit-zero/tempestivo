import { expect, test } from "@playwright/test";

test("a rota de saúde confirma o banco sem vazar detalhes", async ({ request }) => {
  const resposta = await request.get("/api/health");

  expect(resposta.status()).toBe(200);
  expect(Object.keys(await resposta.json()).sort()).toEqual(["banco", "status", "versao"]);
  expect(await resposta.json()).toMatchObject({ status: "ok", banco: "ok" });
});

test("as rotas de job recusam chamada sem o segredo", async ({ request }) => {
  for (const job of ["ping", "alertas"]) {
    expect((await request.post(`/api/jobs/${job}`)).status()).toBe(401);
    expect((await request.post(`/api/jobs/${job}`, { headers: { Authorization: "Bearer errado" } })).status()).toBe(401);
  }
});

test("as respostas trazem os cabeçalhos de segurança", async ({ request }) => {
  const cabecalhos = (await request.get("/")).headers();

  expect(cabecalhos["content-security-policy"]).toContain("frame-ancestors 'none'");
  expect(cabecalhos["x-content-type-options"]).toBe("nosniff");
  expect(cabecalhos["x-frame-options"]).toBe("DENY");
  expect(cabecalhos["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  expect(cabecalhos["x-powered-by"]).toBeUndefined();
});
