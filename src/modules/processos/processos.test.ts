import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { criarCliente } from "@/modules/clientes";
import { apagarContaDeTeste, criarContaDeTeste } from "@/test/banco";
import {
  atualizarProcesso, criarProcesso, excluirProcesso, formatarNumeroCnj, listarProcessos, mudarStatusDoProcesso,
  numeroCnjValido, obterProcesso,
} from "./index";

// Números fictícios com dígito verificador válido.
const NUMERO_1 = "0001234-03.2026.8.26.0100";
const NUMERO_2 = "0005678-06.2026.5.02.0001";
const NUMERO_3 = "1002003-94.2026.8.26.0002";

describe("número do CNJ", () => {
  it("valida o dígito verificador e aceita com ou sem máscara", () => {
    expect(numeroCnjValido(NUMERO_1)).toBe(true);
    expect(numeroCnjValido("00012340320268260100")).toBe(true);
    expect(numeroCnjValido("0001234-04.2026.8.26.0100")).toBe(false);
    expect(numeroCnjValido("123")).toBe(false);
  });

  it("formata os 20 dígitos", () => {
    expect(formatarNumeroCnj("00012340320268260100")).toBe(NUMERO_1);
    expect(formatarNumeroCnj("123")).toBe("123");
  });
});

describe("processos (integração)", () => {
  let contaA: string;
  let contaB: string;
  let clienteA: string;
  let clienteB: string;

  async function novoCliente(contaId: string) {
    const cliente = await criarCliente(contaId, { nome: "Cliente Fictício", documento: "", email: "", telefone: "", observacoes: "" });
    if (!cliente.ok) throw new Error(cliente.erro);
    return cliente.valor.id;
  }
  const entrada = (clienteId: string, numero: string) => ({
    clienteId, numero, tribunal: "TJSP", vara: "1ª Vara Cível", assunto: "Cobrança fictícia", parteContraria: "",
  });

  beforeAll(async () => {
    [contaA, contaB] = await Promise.all([criarContaDeTeste("Conta A"), criarContaDeTeste("Conta B")]);
    [clienteA, clienteB] = await Promise.all([novoCliente(contaA), novoCliente(contaB)]);
  });
  afterAll(async () => {
    await Promise.all([apagarContaDeTeste(contaA), apagarContaDeTeste(contaB)]);
  });

  it("cria guardando só os dígitos do número e traz o cliente", async () => {
    const criado = await criarProcesso(contaA, entrada(clienteA, NUMERO_1));

    expect(criado.ok && criado.valor).toMatchObject({
      numero: "00012340320268260100", status: "ativo", parteContraria: null, cliente: { nome: "Cliente Fictício" },
    });
  });

  it("recusa número inválido, número repetido na conta e cliente de outra conta", async () => {
    expect(await criarProcesso(contaA, entrada(clienteA, "0001234-04.2026.8.26.0100"))).toMatchObject({ ok: false });
    expect(await criarProcesso(contaA, entrada(clienteA, NUMERO_1))).toEqual({ ok: false, erro: "Já existe um processo com este número." });
    expect(await criarProcesso(contaA, entrada(clienteB, NUMERO_2))).toEqual({ ok: false, erro: "Cliente não encontrado." });
  });

  it("o mesmo número pode existir em contas diferentes", async () => {
    expect((await criarProcesso(contaB, entrada(clienteB, NUMERO_1))).ok).toBe(true);
  });

  it("a conta B não enxerga, não altera e não exclui processos da conta A", async () => {
    const criado = await criarProcesso(contaA, entrada(clienteA, NUMERO_3));
    if (!criado.ok) throw new Error(criado.erro);
    const id = criado.valor.id;

    expect(await obterProcesso(contaB, id)).toBeNull();
    expect((await listarProcessos(contaB)).every((processo) => processo.id !== id)).toBe(true);
    expect(await atualizarProcesso(contaB, id, entrada(clienteB, NUMERO_3))).toEqual({ ok: false, erro: "Processo não encontrado." });
    expect(await mudarStatusDoProcesso(contaB, id, "arquivado")).toEqual({ ok: false, erro: "Processo não encontrado." });
    expect(await excluirProcesso(contaB, id)).toEqual({ ok: false, erro: "Processo não encontrado." });
    expect((await obterProcesso(contaA, id))?.status).toBe("ativo");
  });

  it("arquiva, filtra por status, busca e exclui", async () => {
    const criado = await criarProcesso(contaA, entrada(clienteA, NUMERO_2));
    if (!criado.ok) throw new Error(criado.erro);
    const id = criado.valor.id;

    expect((await mudarStatusDoProcesso(contaA, id, "arquivado")).ok).toBe(true);
    expect((await listarProcessos(contaA, { status: "arquivado" })).map((processo) => processo.id)).toEqual([id]);
    expect((await listarProcessos(contaA, { status: "ativo" })).some((processo) => processo.id === id)).toBe(false);
    expect((await listarProcessos(contaA, { busca: "0005678" })).map((processo) => processo.id)).toEqual([id]);
    // Dígitos soltos dentro de um termo de texto não casam com o número do processo.
    expect(await listarProcessos(contaA, { busca: "assunto 0005678" })).toEqual([]);
    expect((await listarProcessos(contaA, { busca: "cobrança" })).some((processo) => processo.id === id)).toBe(true);
    expect((await excluirProcesso(contaA, id)).ok).toBe(true);
    expect(await obterProcesso(contaA, id)).toBeNull();
  });
});
