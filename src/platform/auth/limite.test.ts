import { describe, expect, it } from "vitest";
import { criarLimitador } from "./limite";

describe("limitador de tentativas", () => {
  function montar() {
    let relogio = 0;
    const limitador = criarLimitador({ maximo: 3, janelaMs: 1000, agora: () => relogio });
    return { limitador, avancar: (ms: number) => (relogio += ms) };
  }

  it("permite até o máximo e bloqueia a tentativa seguinte", () => {
    const { limitador } = montar();

    expect([1, 2, 3].map(() => limitador.permitir("a"))).toEqual([true, true, true]);
    expect(limitador.permitir("a")).toBe(false);
  });

  it("conta cada chave em separado", () => {
    const { limitador } = montar();
    [1, 2, 3].forEach(() => limitador.permitir("a"));

    expect(limitador.permitir("b")).toBe(true);
  });

  it("volta a permitir quando a janela passa", () => {
    const { limitador, avancar } = montar();
    [1, 2, 3].forEach(() => limitador.permitir("a"));

    avancar(999);
    expect(limitador.permitir("a")).toBe(false);
    avancar(1);
    expect(limitador.permitir("a")).toBe(true);
  });

  it("tentativa bloqueada não estende o bloqueio", () => {
    const { limitador, avancar } = montar();
    [1, 2, 3].forEach(() => limitador.permitir("a"));

    avancar(500);
    limitador.permitir("a");
    avancar(500);
    expect(limitador.permitir("a")).toBe(true);
  });

  it("libera a chave depois de um sucesso", () => {
    const { limitador } = montar();
    [1, 2, 3].forEach(() => limitador.permitir("a"));

    limitador.liberar("a");
    expect(limitador.permitir("a")).toBe(true);
  });
});
