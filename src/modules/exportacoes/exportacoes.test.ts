import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { gerarPlanilha } from "@/lib/planilha";
import { criarCliente, listarClientes } from "@/modules/clientes";
import { criarAudiencia } from "@/modules/audiencias";
import { criarHonorario, definirPagamentoDaParcela, listarHonorarios, resumoFinanceiro } from "@/modules/honorarios";
import { cadastrarPrazo, listarPrazos, marcarComoCumprido } from "@/modules/prazos";
import { criarProcesso, listarProcessos, mudarStatusDoProcesso } from "@/modules/processos";
import { criarTarefa, moverTarefa } from "@/modules/tarefas";
import { getPrisma } from "@/platform/database";
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

describe("planilha de prazos", () => {
  beforeAll(async () => {
    for (const conta of [contaA, contaB]) {
      const marca = conta === contaA ? "AlfaDaContaA" : "BetaDaContaB";
      const processo = (await listarProcessos(conta, { status: "ativo" }))[0]!;
      const calculado = await cadastrarPrazo(conta, {
        origem: "calculada", processoId: processo.id, descricao: `Contestação ${marca}`, dataEvento: "2026-11-12",
        tipoEvento: "intimacao", dias: "15", contagem: "uteis", emDobro: false, conferiNosAutos: true,
      });
      if (!calculado.ok) throw new Error(calculado.erro);
      const vencido = await cadastrarPrazo(conta, { origem: "manual", processoId: processo.id, descricao: `Vencido ${marca}`, dataFinal: "2026-11-20" });
      const cumprido = await cadastrarPrazo(conta, { origem: "manual", processoId: processo.id, descricao: `Cumprido ${marca}`, dataFinal: "2026-12-10" });
      const nestaSemana = await cadastrarPrazo(conta, { origem: "manual", processoId: processo.id, descricao: `Semana ${marca}`, dataFinal: "2026-12-01" });
      if (!vencido.ok || !cumprido.ok || !nestaSemana.ok) throw new Error("prazo");
      await marcarComoCumprido(conta, cumprido.valor.id, new Date("2026-11-25T02:30:00Z"));
    }
  });

  it("leva 'cálculo auxiliar, confira' no cabeçalho da data e tem o Leia-me com o aviso das regras", async () => {
    const { cabecalho, aba, tudo } = await abrir(contaA, "prazos");

    expect(cabecalho("Prazos")).toEqual([
      "Descrição", "Cliente", "Processo", "Número", "Tribunal", "Data final (cálculo auxiliar, confira)", "Origem da data",
      "Meta interna", "Situação", "Última conferência", "Cumprido em",
    ]);
    const avisos = valores(aba("Leia-me")).map((linha) => linha[0]);
    expect(avisos).toContain("Cálculo auxiliar, confira.");
    expect(avisos.some((aviso) => String(aviso).includes("ainda não foram validadas por um advogado"))).toBe(true);
    expect(tudo).not.toContain("BetaDaContaB");
  });

  it("mostra a data, a origem, a meta e a situação como a tela", async () => {
    const { aba } = await abrir(contaA, "prazos");
    const naTela = await listarPrazos(contaA, { filtro: "em_aberto" }, AGORA);
    const linhas = valores(aba("Prazos"));

    expect(linhas.map((linha) => linha[0])).toEqual(naTela.map((prazo) => prazo.descricao));
    const calculado = linhas.find((linha) => String(linha[0]).startsWith("Contestação"))!;
    // 04/12/2026 e 02/12/2026 como números de série do Excel.
    expect([calculado[5], calculado[6], calculado[7]]).toEqual([46_360, "calculada", 46_358]);
    expect(calculado[8]).toBe(naTela.find((prazo) => prazo.descricao.startsWith("Contestação"))!.situacao.quando);
    expect(aba("Prazos").linhas[1]![5]!.formato).toBe("dd/mm/yyyy");
    const vencido = linhas.find((linha) => String(linha[0]).startsWith("Vencido"))!;
    expect([vencido[6], vencido[7]]).toEqual(["manual", null]);
  });

  it.each([
    ["em_aberto", "em_aberto"], ["vencidos", "vencidos"], ["cumpridos", "cumpridos"], ["proximos_7_dias", "proximos_7_dias"],
    ["inventado", "em_aberto"],
  ] as const)("o filtro %s é o mesmo da tela", async (filtro, naTela) => {
    const { aba } = await abrir(contaA, "prazos", { filtro });
    const esperados = await listarPrazos(contaA, { filtro: naTela }, AGORA);

    expect(valores(aba("Prazos")).map((linha) => linha[0])).toEqual(esperados.map((prazo) => prazo.descricao));
  });

  it("cada filtro traz exatamente os prazos esperados", async () => {
    const nomes = async (filtro: string) =>
      valores((await abrir(contaA, "prazos", { filtro })).aba("Prazos")).map((linha) => String(linha[0]).split(" ")[0]);

    expect(await nomes("proximos_7_dias")).toEqual(["Semana"]);
    expect(await nomes("vencidos")).toEqual(["Vencido"]);
    expect(await nomes("cumpridos")).toEqual(["Cumprido"]);
    expect((await nomes("em_aberto")).sort()).toEqual(["Contestação", "Semana", "Vencido"]);
  });

  it("prazo cumprido sai com o instante no horário de São Paulo", async () => {
    const { aba } = await abrir(contaA, "prazos", { filtro: "cumpridos" });

    // 24/11/2026 23:30 em São Paulo.
    expect(aba("Prazos").linhas[1]![10]).toMatchObject({ formato: "dd/mm/yyyy hh:mm" });
    expect(aba("Prazos").linhas[1]![10]!.valor).toBeCloseTo(46_350 + 23.5 / 24, 6);
  });
});

describe("planilha de honorários", () => {
  beforeAll(async () => {
    for (const conta of [contaA, contaB]) {
      const marca = conta === contaA ? "AlfaDaContaA" : "BetaDaContaB";
      const cliente = (await listarClientes(conta, "Ana"))[0]!;
      // Parcelas em 26/09 (paga), 26/10 (em atraso), 26/11 (vence hoje) e 26/12 (a vencer).
      const criado = await criarHonorario(conta, {
        clienteId: cliente.id, processoId: "", descricao: `Honorário ${marca}`, valorTotal: "1.000,01", parcelas: "4",
        primeiroVencimento: "2026-09-26",
      });
      if (!criado.ok) throw new Error(criado.erro);
      const [primeira] = (await listarHonorarios(conta, AGORA))[0]!.parcelas;
      await definirPagamentoDaParcela(conta, primeira!.id, true, new Date("2026-09-27T01:00:00Z"));
    }
  });

  it("a aba de honorários soma as parcelas, em dinheiro", async () => {
    const { aba, cabecalho, tudo } = await abrir(contaA, "honorarios");

    expect(cabecalho("Honorários")).toEqual(["Cliente", "Descrição", "Processo", "Total", "Pago", "Em aberto", "Em atraso"]);
    // 1.000,01 em 4: 250,01 + 250,00 + 250,00 + 250,00.
    expect(valores(aba("Honorários"))).toEqual([
      ["Ana AlfaDaContaA", "Honorário AlfaDaContaA", null, 1000.01, 250.01, 750, 250],
    ]);
    expect(aba("Honorários").linhas[1]![3]!.formato).toBe('"R$" #,##0.00');
    expect(tudo).not.toContain("BetaDaContaB");
  });

  it("a aba de parcelas traz a situação e as datas de cada uma", async () => {
    const { aba, cabecalho } = await abrir(contaA, "honorarios");

    expect(cabecalho("Parcelas")).toEqual(["Cliente", "Descrição", "Parcela", "Valor", "Vencimento", "Situação", "Paga em"]);
    const linhas = valores(aba("Parcelas"));
    expect(linhas.map((linha) => [linha[2], linha[3], linha[5]])).toEqual([
      ["1 de 4", 250.01, "paga"], ["2 de 4", 250, "em atraso"], ["3 de 4", 250, "vence hoje"], ["4 de 4", 250, "a vencer"],
    ]);
    // Paga às 22:00 de 26/09 em São Paulo, ainda dia 26.
    expect(aba("Parcelas").linhas[1]![6]!.valor).toBeCloseTo(46_291 + 22 / 24, 6);
  });
});

const LINK_DE_SALA = "https://sala.exemplo.test/entrar?senha=SENHA-DA-SALA";

describe("planilhas de audiências e de tarefas", () => {
  beforeAll(async () => {
    for (const conta of [contaA, contaB]) {
      const marca = conta === contaA ? "AlfaDaContaA" : "BetaDaContaB";
      const processo = (await listarProcessos(conta, { status: "ativo" }))[0]!;
      for (const [tipo, data, hora] of [["Instrução", "2026-12-01", "23:30"], ["Conciliação", "2026-11-10", "09:00"]]) {
        const criada = await criarAudiencia(conta, {
          processoId: processo.id, tipo: `${tipo} ${marca}`, data, hora, duracaoMin: "45", local: `Fórum ${marca}`,
          linkVirtual: LINK_DE_SALA, observacoes: `Obs ${marca}`,
        });
        if (!criada.ok) throw new Error(criada.erro);
      }
      const tarefa = await criarTarefa(conta, { titulo: `Protocolar ${marca}`, descricao: "Descrição fictícia", limite: "2026-12-03", processoId: processo.id });
      if (!tarefa.ok) throw new Error(tarefa.erro);
      await moverTarefa(conta, tarefa.valor.id, "fazendo");
    }
  });

  it("separa próximas e realizadas, no horário de São Paulo", async () => {
    const { aba, cabecalho, tudo } = await abrir(contaA, "audiencias");

    expect(cabecalho("Próximas")).toEqual([
      "Data", "Hora", "Duração em minutos", "Tipo", "Cliente", "Processo", "Número", "Local", "Observações",
    ]);
    expect(valores(aba("Próximas")).map((linha) => linha.slice(0, 4))).toEqual([[46_357, "23:30", 45, "Instrução AlfaDaContaA"]]);
    expect(valores(aba("Realizadas")).map((linha) => linha.slice(0, 4))).toEqual([[46_336, "09:00", 45, "Conciliação AlfaDaContaA"]]);
    expect(tudo).not.toContain("BetaDaContaB");
  });

  it("o link da sala virtual não aparece em parte nenhuma do arquivo", async () => {
    const { tudo } = await abrir(contaA, "audiencias");

    expect(tudo).not.toContain("SENHA-DA-SALA");
    expect(tudo).not.toContain("sala.exemplo.test");
  });

  it("tarefas saem com o nome da coluna do quadro", async () => {
    const { aba, cabecalho, tudo } = await abrir(contaA, "tarefas");

    expect(cabecalho("Tarefas")).toEqual(["Título", "Descrição", "Coluna do quadro", "Data limite", "Processo"]);
    expect(valores(aba("Tarefas"))).toEqual([
      ["Protocolar AlfaDaContaA", "Descrição fictícia", "Fazendo", 46_359, "Ação de cobrança AlfaDaContaA"],
    ]);
    expect(tudo).not.toContain("BetaDaContaB");
  });
});

// Por último no arquivo: usa tudo o que os blocos anteriores cadastraram.
describe("planilha completa", () => {
  // Um pagamento neste mês, para o "recebido no mês" não ser sempre zero.
  beforeAll(async () => {
    const quarta = (await listarHonorarios(contaA, AGORA))[0]!.parcelas[3]!;
    await definirPagamentoDaParcela(contaA, quarta.id, true, new Date("2026-11-25T15:00:00Z"));
  });

  const ABAS = [
    "Resumo", "Clientes", "Processos", "Prazos", "Leia-me", "Honorários", "Parcelas", "Audiências próximas",
    "Audiências realizadas", "Tarefas",
  ];

  it("tem uma aba por lista, mais o resumo, e só dados da própria conta", async () => {
    const { lida, tudo, nomeDoArquivo } = await abrir(contaA, "completa");

    expect(lida.abas.map((aba) => aba.nome)).toEqual(ABAS);
    expect(nomeDoArquivo).toBe("tempestivo-completa-2026-11-26.xlsx");
    expect(tudo).toContain("AlfaDaContaA");
    expect(tudo).not.toContain("BetaDaContaB");
  });

  it("ignora os filtros do endereço: traz processos arquivados e prazos cumpridos", async () => {
    const completa = await abrir(contaA, "completa", { busca: "nada-casa-com-isto", status: "arquivado", filtro: "vencidos" });
    const processos = await abrir(contaA, "processos", { status: "todos" });
    const abertos = await abrir(contaA, "prazos", { filtro: "em_aberto" });
    const cumpridos = await abrir(contaA, "prazos", { filtro: "cumpridos" });
    const clientes = await abrir(contaA, "clientes");

    expect(valores(completa.aba("Clientes"))).toEqual(valores(clientes.aba("Clientes")));
    expect(valores(completa.aba("Processos"))).toEqual(valores(processos.aba("Processos")));
    expect(valores(completa.aba("Prazos"))).toEqual([...valores(abertos.aba("Prazos")), ...valores(cumpridos.aba("Prazos"))]);
    expect(completa.cabecalho("Prazos")).toEqual(abertos.cabecalho("Prazos"));
    expect(valores(completa.aba("Leia-me"))).toContainEqual(["Cálculo auxiliar, confira."]);
  });

  it("o resumo bate com as abas e com os totais da tela de honorários", async () => {
    const { aba, cabecalho } = await abrir(contaA, "completa");
    const financeiro = await resumoFinanceiro(contaA, AGORA);
    const resumo = new Map(valores(aba("Resumo")).map(([item, quantidade, valor]) => [item, quantidade ?? valor]));

    expect(cabecalho("Resumo")).toEqual(["Item", "Quantidade", "Valor"]);
    for (const [item, nomeDaAba] of [
      ["Clientes", "Clientes"], ["Processos", "Processos"], ["Honorários", "Honorários"], ["Tarefas", "Tarefas"],
      ["Audiências próximas", "Audiências próximas"], ["Audiências realizadas", "Audiências realizadas"],
    ] as const) {
      expect(resumo.get(item), item).toBe(aba(nomeDaAba).linhas.length - 1);
    }
    expect([resumo.get("Prazos em aberto"), resumo.get("Prazos cumpridos")]).toEqual([3, 1]);
    expect([
      resumo.get("Honorários a receber"), resumo.get("Honorários em atraso"), resumo.get("Honorários recebidos neste mês"),
    ]).toEqual([500, 250, 250]);
    expect(resumo.get("Honorários a receber")).toBe(financeiro.aReceberCentavos / 100);
    expect(resumo.get("Honorários em atraso")).toBe(financeiro.emAtrasoCentavos / 100);
    expect(resumo.get("Honorários recebidos neste mês")).toBe(financeiro.recebidoNoMesCentavos / 100);
  });

  it("não leva identificadores, tokens, dados de acesso nem o link da sala", async () => {
    const conta = await getPrisma().conta.findUniqueOrThrow({ where: { id: contaA }, select: { usuarioId: true } });
    const ids = (
      await Promise.all([
        getPrisma().cliente.findMany({ where: { contaId: contaA }, select: { id: true } }),
        getPrisma().processo.findMany({ where: { contaId: contaA }, select: { id: true } }),
        getPrisma().prazo.findMany({ where: { contaId: contaA }, select: { id: true } }),
        getPrisma().parcela.findMany({ where: { contaId: contaA }, select: { id: true } }),
        getPrisma().honorario.findMany({ where: { contaId: contaA }, select: { id: true } }),
        getPrisma().audiencia.findMany({ where: { contaId: contaA }, select: { id: true } }),
        getPrisma().tarefa.findMany({ where: { contaId: contaA }, select: { id: true } }),
      ])
    ).flat();
    await getPrisma().conta.update({
      where: { id: contaA },
      data: { agendaTokenHash: `HASH-DA-AGENDA-${contaA}`, substitutoTokenHash: `HASH-DO-CONVITE-${contaA}` },
    });

    const { tudo } = await abrir(contaA, "completa");

    expect(ids.length).toBeGreaterThan(10);
    for (const segredo of [contaA, conta.usuarioId, ...ids.map(({ id }) => id), "HASH-DA-AGENDA", "HASH-DO-CONVITE", "SENHA-DA-SALA"]) {
      expect(tudo, segredo).not.toContain(segredo);
    }
  });

  it("conta sem nada gera todas as abas só com o cabeçalho", async () => {
    const vazia = await criarContaDeTeste("Conta vazia");
    const { lida } = await abrir(vazia, "completa");

    expect(lida.abas.map((aba) => aba.nome)).toEqual(ABAS);
    for (const aba of lida.abas.filter((a) => !["Resumo", "Leia-me"].includes(a.nome))) expect(aba.linhas, aba.nome).toHaveLength(1);
    await apagarContaDeTeste(vazia);
  });
});
