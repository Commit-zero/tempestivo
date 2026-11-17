import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { apagarContaDeTeste, criarContaDeTeste } from "@/test/banco";
import { atualizarCliente, criarCliente, excluirCliente, listarClientes, obterCliente } from "./index";

const vazio = { documento: "", email: "", telefone: "", observacoes: "" };

describe("clientes (integração)", () => {
  let contaA: string;
  let contaB: string;

  beforeAll(async () => {
    [contaA, contaB] = await Promise.all([criarContaDeTeste("Conta A"), criarContaDeTeste("Conta B")]);
  });
  afterAll(async () => {
    await Promise.all([apagarContaDeTeste(contaA), apagarContaDeTeste(contaB)]);
  });

  it("cria normalizando documento e telefone, e lista em ordem alfabética", async () => {
    await criarCliente(contaA, { ...vazio, nome: "Zélia Fictícia" });
    const criado = await criarCliente(contaA, {
      nome: "  Ana Fictícia  ", documento: "529.982.247-25", email: "ana@exemplo.test", telefone: "(11) 91234-5678", observacoes: "",
    });

    expect(criado.ok && criado.valor).toMatchObject({ nome: "Ana Fictícia", documento: "52998224725", telefone: "11912345678", observacoes: null });
    expect((await listarClientes(contaA)).map((cliente) => cliente.nome)).toEqual(["Ana Fictícia", "Zélia Fictícia"]);
    expect((await listarClientes(contaA, "zél")).map((cliente) => cliente.nome)).toEqual(["Zélia Fictícia"]);
  });

  it("recusa nome curto, documento, e-mail e telefone inválidos com mensagem em português", async () => {
    const casos = [
      [{ nome: "A" }, "Informe o nome do cliente."],
      [{ documento: "111.111.111-11" }, "CPF ou CNPJ inválido."],
      [{ email: "nao-e-email" }, "E-mail inválido."],
      [{ telefone: "1234" }, "Telefone inválido. Informe com DDD."],
    ] as const;
    for (const [campo, mensagem] of casos) {
      expect(await criarCliente(contaA, { ...vazio, nome: "Cliente Fictício", ...campo })).toEqual({ ok: false, erro: mensagem });
    }
  });

  it("a conta B não enxerga, não altera e não exclui clientes da conta A", async () => {
    const criado = await criarCliente(contaA, { ...vazio, nome: "Só da Conta A" });
    if (!criado.ok) throw new Error(criado.erro);
    const id = criado.valor.id;

    expect(await obterCliente(contaB, id)).toBeNull();
    expect(await listarClientes(contaB)).toEqual([]);
    expect(await atualizarCliente(contaB, id, { ...vazio, nome: "Invadido" })).toEqual({ ok: false, erro: "Cliente não encontrado." });
    expect(await excluirCliente(contaB, id)).toEqual({ ok: false, erro: "Cliente não encontrado." });
    expect((await obterCliente(contaA, id))?.nome).toBe("Só da Conta A");
  });

  it("atualiza e exclui dentro da própria conta", async () => {
    const criado = await criarCliente(contaA, { ...vazio, nome: "Temporário Fictício" });
    if (!criado.ok) throw new Error(criado.erro);

    expect((await atualizarCliente(contaA, criado.valor.id, { ...vazio, nome: "Renomeado Fictício" })).ok).toBe(true);
    expect((await obterCliente(contaA, criado.valor.id))?.nome).toBe("Renomeado Fictício");
    expect((await excluirCliente(contaA, criado.valor.id)).ok).toBe(true);
    expect(await obterCliente(contaA, criado.valor.id)).toBeNull();
  });
});
