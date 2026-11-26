import { describe, expect, it } from "vitest";
import { CAMPO_DE_CONFIRMACAO, foiConfirmado, SEM_CONFIRMACAO, VALOR_CONFIRMADO } from "./confirmacao";

describe("confirmação de ação que apaga", () => {
  const formulario = (valor?: string) => {
    const dados = new FormData();
    if (valor !== undefined) dados.set(CAMPO_DE_CONFIRMACAO, valor);
    return dados;
  };

  it("só vale com o valor que o botão do diálogo envia", () => {
    expect(foiConfirmado(formulario(VALOR_CONFIRMADO))).toBe(true);
  });

  it.each([undefined, "", "nao", "true", "on"])("recusa o envio sem confirmação: %j", (valor) => {
    expect(foiConfirmado(formulario(valor))).toBe(false);
  });

  it("recusa chamada sem formulário", () => {
    expect(foiConfirmado(undefined)).toBe(false);
    expect(foiConfirmado({} as FormData)).toBe(false);
    expect(SEM_CONFIRMACAO).toBe("Confirme na janela antes de apagar.");
  });
});
