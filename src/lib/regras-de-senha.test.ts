import { describe, expect, it } from "vitest";
import { avaliarSenha, erroDaSenha } from "./regras-de-senha";

const naoAtendidas = (senha: string, email?: string) =>
  avaliarSenha(senha, email)
    .filter((regra) => !regra.atendida)
    .map((regra) => regra.id);

describe("regras de senha", () => {
  it("aceita uma frase longa, sem exigir maiúscula, número ou símbolo", () => {
    expect(naoAtendidas("cavalo correndo no campo", "maria@exemplo.test")).toEqual([]);
    expect(erroDaSenha("cavalo correndo no campo", "maria@exemplo.test")).toBeNull();
  });

  it.each([
    [9, ["tamanho"]],
    [10, []],
    [128, []],
    [129, ["tamanho"]],
  ])("confere o tamanho: %i caracteres", (tamanho, esperado) => {
    // Sequência sem período curto, para só a regra de tamanho decidir.
    const senha = Array.from({ length: tamanho }, (_, i) => String.fromCharCode(97 + ((i * i + i) % 26))).join("");

    expect(naoAtendidas(senha)).toEqual(esperado);
  });

  it("recusa o nome do e-mail dentro da senha, sem diferenciar maiúsculas", () => {
    expect(naoAtendidas("minha-MARIA-2026", "maria@exemplo.test")).toEqual(["email"]);
    expect(naoAtendidas("joao.silva-no-forum", "Joao.Silva@exemplo.test")).toEqual(["email"]);
  });

  it("só aplica a regra do e-mail com 4 caracteres ou mais antes do @", () => {
    expect(naoAtendidas("ana vai ao forum cedo", "ana@exemplo.test")).toEqual([]);
    expect(naoAtendidas("lara vai ao forum cedo", "lara@exemplo.test")).toEqual(["email"]);
  });

  it("sem e-mail informado, a regra do e-mail conta como atendida", () => {
    expect(naoAtendidas("cavalo correndo no campo")).toEqual([]);
    expect(naoAtendidas("cavalo correndo no campo", "")).toEqual([]);
  });

  it.each(["aaaaaaaaaa", "abababababab", "abcabcabcabc", "abcabcabca", "123123123123", "XyZ9!XyZ9!XyZ9!"])(
    "recusa o mesmo caractere ou bloco curto repetido: %s",
    (senha) => {
      expect(naoAtendidas(senha)).toContain("repeticao");
    },
  );

  it.each(["abcdef-um-dia-abcdef", "cavalo correndo no campo", "aaaaaaaaab"])("não confunde com repetição: %s", (senha) => {
    expect(naoAtendidas(senha)).not.toContain("repeticao");
  });

  it.each(["1234567890", "Password123", "SENHA12345", "qwertyuiop", "1q2w3e4r5t"])("recusa a senha comum: %s", (senha) => {
    expect(naoAtendidas(senha)).toContain("comum");
  });

  it("o erro é a mensagem da primeira regra não atendida", () => {
    expect(erroDaSenha("curta")).toBe("A senha precisa ter de 10 a 128 caracteres.");
    expect(erroDaSenha("minha-maria-2026", "maria@exemplo.test")).toBe("A senha não pode conter o nome do seu e-mail.");
    expect(erroDaSenha("aaaaaaaaaaaa")).toBe("A senha não pode ser um caractere ou um trecho curto repetido.");
    expect(erroDaSenha("1234567890")).toBe("Essa senha é muito comum. Escolha outra.");
  });
});
