import { describe, expect, it } from "vitest";
import { AVISOS, codificarAviso, lerAviso, type ChaveDeAviso } from "./avisos";

describe("avisos de resultado", () => {
  it("o que vai no cookie é só a chave e o instante: nenhum texto", () => {
    expect(codificarAviso("cliente-excluido", 1234)).toBe("cliente-excluido.1234");
  });

  it("lê de volta a mensagem, com um identificador que muda a cada ação", () => {
    expect(lerAviso("cliente-excluido.1234")).toEqual({ id: "cliente-excluido.1234", texto: "Cliente excluído." });
    expect(lerAviso("cliente-excluido.1235")?.id).not.toBe("cliente-excluido.1234");
  });

  it.each([
    undefined, "", "cliente-excluido", "chave-que-nao-existe.1", "<script>.1", "cliente-excluido.abc", "toString.1",
    "__proto__.1", "constructor.1", "cliente-excluido.1.2",
  ])("ignora valor que não veio do app: %j", (valor) => {
    expect(lerAviso(valor)).toBeNull();
  });

  it("toda mensagem é uma frase curta, sem lacuna para dado pessoal", () => {
    for (const chave of Object.keys(AVISOS) as ChaveDeAviso[]) {
      expect(chave).toMatch(/^[a-z]+(-[a-z]+)+$/);
      expect(AVISOS[chave]).toMatch(/^[A-ZÀ-Ú][^{}$]{3,80}\.$/);
    }
  });
});
