import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { gerarPlanilha } from "@/lib/planilha";
import { criarCliente, listarClientes } from "@/modules/clientes";
import { criarProcesso, listarProcessos, mudarStatusDoProcesso } from "@/modules/processos";
import { apagarContaDeTeste, criarContaDeTeste } from "@/test/banco";
import { lerPlanilha, valores } from "@/test/ler-planilha";
import { ehLista, montarPlanilha, permitirPlanilha, type FiltrosDaPlanilha, type Lista } from "./index";

// As planilhas, lidas de volta do arquivo gerado, com Postgres de verdade e duas contas:
// nenhuma pode receber dado da outra. Só dados fictícios.

const AGORA = new Date("2026-11-26T15:00:00Z");
let contaA: string;
let contaB: string;

async function popular(contaId: string, marca: string) {
  const cliente = await criarCliente(contaId, {
    nome: `Ana ${marca}`, documento: "529.982.247-25", email: `ana.${marca.toLowerCase()}@exemplo.test`,
    telefone: "(11) 91234-5678", observacoes: `=1+1 observação ${marca}`,
  });
  if (!cliente.ok) throw new Error(cliente.erro);
  await criarCliente(contaId, { nome: `Zeca ${marca}`, documento: "", email: "", telefone: "", observacoes: "" });
  const processo = await criarProcesso(contaId, {
    clienteId: cliente.valor.id, numero: "0001234-03.2026.8.26.0100", tribunal: "TJSP", vara: `Vara ${marca}`,
    assunto: `Ação de cobrança ${marca}`, parteContraria: `Parte ${marca}`,
  });
  if (!processo.ok) throw new Error(processo.erro);
  return { clienteId: cliente.valor.id, processoId: processo.valor.id };
}

beforeAll(async () => {
  [contaA, contaB] = await Promise.all([criarContaDeTeste("Conta A"), criarContaDeTeste("Conta B")]);
  await popular(contaA, "AlfaDaContaA");
  await popular(contaB, "BetaDaContaB");
});
afterAll(async () => {
  await Promise.all([apagarContaDeTeste(contaA), apagarContaDeTeste(contaB)]);
});

/** Monta, gera o arquivo e lê de volta, como quem abre a planilha baixada. */
async function abrir(contaId: string, lista: Lista, filtros: FiltrosDaPlanilha = {}) {
  const planilha = await montarPlanilha(contaId, lista, filtros, AGORA);
  const lida = lerPlanilha(await gerarPlanilha(planilha.abas));
  const aba = (nome: string) => {
    const achada = lida.abas.find((a) => a.nome === nome);
    if (!achada) throw new Error(`Sem a aba ${nome}.`);
    return achada;
  };
  const cabecalho = (nome: string) => aba(nome).linhas[0]!.map((c) => c.valor);
  /** Tudo o que há de texto no arquivo, em qualquer parte. */
  const tudo = Object.values(lida.arquivos).join("\n");
  return { ...planilha, lida, aba, cabecalho, tudo };
}

describe("listas e nome do arquivo", () => {
  it("só aceita as listas conhecidas", () => {
    expect(ehLista("clientes")).toBe(true);
    for (const outra of ["", "contas", "usuarios", "../clientes", "__proto__", "constructor", "Clientes"]) {
      expect(ehLista(outra), outra).toBe(false);
    }
  });

  it("o nome do arquivo tem a lista e o dia em São Paulo, sem dado pessoal", async () => {
    const quaseMeiaNoite = new Date("2026-11-27T02:30:00Z");

    const planilha = await montarPlanilha(contaA, "clientes", { busca: "Ana" }, quaseMeiaNoite);

    expect(planilha.nomeDoArquivo).toBe("tempestivo-clientes-2026-11-26.xlsx");
  });

  it("permite 10 planilhas por minuto para cada conta", () => {
    const respostas = Array.from({ length: 11 }, () => permitirPlanilha("conta-do-limite"));

    expect(respostas).toEqual([...Array.from({ length: 10 }, () => true), false]);
    expect(permitirPlanilha("outra-conta-do-limite")).toBe(true);
  });
});

describe("planilha de clientes", () => {
  it("traz as colunas pedidas, só da própria conta, com documento como texto", async () => {
    const { aba, cabecalho, tudo, lida } = await abrir(contaA, "clientes");

    expect(cabecalho("Clientes")).toEqual([
      "Nome", "CPF ou CNPJ", "E-mail", "Telefone", "Observações", "Processos", "Cadastrado em",
    ]);
    expect(valores(aba("Clientes"))).toEqual([
      ["Ana AlfaDaContaA", "529.982.247-25", "ana.alfadacontaa@exemplo.test", expect.stringContaining("91234"), "=1+1 observação AlfaDaContaA", 1, expect.any(Number)],
      ["Zeca AlfaDaContaA", null, null, null, null, 0, expect.any(Number)],
    ]);
    expect(aba("Clientes").linhas[1]![6]!.formato).toBe("dd/mm/yyyy");
    expect(lida.temFormula).toBe(false);
    expect(tudo).not.toContain("BetaDaContaB");
    expect(tudo).not.toContain(contaA);
  });

  it("a busca é a mesma da tela", async () => {
    const { aba } = await abrir(contaA, "clientes", { busca: "  zeca " });
    const naTela = await listarClientes(contaA, "  zeca ");

    expect(valores(aba("Clientes")).map((linha) => linha[0])).toEqual(naTela.map((cliente) => cliente.nome));
    expect(naTela).toHaveLength(1);
  });

  it("buscar o nome de um cliente de outra conta não traz nada", async () => {
    const { aba } = await abrir(contaA, "clientes", { busca: "BetaDaContaB" });

    expect(aba("Clientes").linhas).toHaveLength(1);
  });
});

describe("planilha de processos", () => {
  beforeAll(async () => {
    const cliente = (await listarClientes(contaA, "Zeca"))[0]!;
    const arquivado = await criarProcesso(contaA, {
      clienteId: cliente.id, numero: "0009999-60.2026.8.26.0100", tribunal: "TJSP", vara: "", assunto: "Ação arquivada fictícia", parteContraria: "",
    });
    if (!arquivado.ok) throw new Error(arquivado.erro);
    await mudarStatusDoProcesso(contaA, arquivado.valor.id, "arquivado");
  });

  it("traz o número CNJ formatado, como texto, e só da própria conta", async () => {
    const { aba, cabecalho, tudo } = await abrir(contaA, "processos");

    expect(cabecalho("Processos")).toEqual([
      "Número", "Cliente", "Assunto", "Tribunal", "Vara", "Parte contrária", "Situação", "Cadastrado em",
    ]);
    expect(aba("Processos").linhas[1]![0]).toMatchObject({ tipo: "texto", valor: "0001234-03.2026.8.26.0100" });
    expect(valores(aba("Processos"))[0]!.slice(1, 7)).toEqual([
      "Ana AlfaDaContaA", "Ação de cobrança AlfaDaContaA", "TJSP", "Vara AlfaDaContaA", "Parte AlfaDaContaA", "Ativo",
    ]);
    expect(tudo).not.toContain("BetaDaContaB");
  });

  it.each([
    [{}, { status: "ativo" }],
    [{ status: "arquivado" }, { status: "arquivado" }],
    [{ status: "todos" }, {}],
    [{ status: "valor-inventado" }, { status: "ativo" }],
    [{ status: "todos", busca: "arquivada" }, { busca: "arquivada" }],
  ] as const)("o filtro %j é o mesmo da tela", async (filtros, naTela) => {
    const { aba } = await abrir(contaA, "processos", filtros);
    const esperados = await listarProcessos(contaA, naTela);

    expect(valores(aba("Processos")).map((linha) => linha[2])).toEqual(esperados.map((processo) => processo.assunto));
  });
});
