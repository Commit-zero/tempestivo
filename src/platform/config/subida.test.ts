import { describe, expect, it, vi } from "vitest";
import { ErroDeConfiguracao } from "./env";
import { validarNaSubida } from "./subida";

describe("validarNaSubida", () => {
  it("não encerra nem escreve quando a configuração é válida", () => {
    const sair = vi.fn();
    const escrever = vi.fn();
    validarNaSubida(() => ({}), escrever, sair);
    expect(sair).not.toHaveBeenCalled();
    expect(escrever).not.toHaveBeenCalled();
  });

  it("escreve a mensagem e encerra com código 1 quando a configuração é inválida", () => {
    const sair = vi.fn();
    const escrever = vi.fn();
    validarNaSubida(
      () => {
        throw new ErroDeConfiguracao(["JOBS_SECRET"]);
      },
      escrever,
      sair,
    );
    expect(escrever).toHaveBeenCalledWith(
      "Configuração inválida. Corrija as variáveis: JOBS_SECRET.",
    );
    expect(sair).toHaveBeenCalledWith(1);
  });

  it("repassa erros que não são de configuração", () => {
    const sair = vi.fn();
    const erro = new Error("outro");
    expect(() =>
      validarNaSubida(
        () => {
          throw erro;
        },
        vi.fn(),
        sair,
      ),
    ).toThrow(erro);
    expect(sair).not.toHaveBeenCalled();
  });
});
