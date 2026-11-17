import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { criarCliente } from "@/modules/clientes";
import { criarProcesso } from "@/modules/processos";
import { apagarContaDeTeste, criarContaDeTeste } from "@/test/banco";
import {
  ajustarTipoDoCatalogo, cadastrarDiaSemExpediente, cadastrarPrazo, CONFIRME_A_CONFERENCIA, confirmarConferencia, criarTipoDePrazo,
  desfazerCumprido, editarPrazo, excluirPrazo, listarDiasSemExpediente, listarPrazos, listarTiposDePrazo,
  marcarComoCumprido, obterPrazo, previsualizarPrazo, removerTipoDaConta,
} from "../index";

// 12/11/2026 (quinta-feira) ao meio-dia em São Paulo.
const agora = new Date("2026-11-12T15:00:00Z");
const calculada = (processoId: string, extra: Record<string, unknown> = {}) => ({
  origem: "calculada", processoId, descricao: "Contestação", dataEvento: "2026-11-12", tipoEvento: "intimacao",
  dias: 15, contagem: "uteis", emDobro: false, conferiNosAutos: true, ...extra,
});

describe("prazos (integração)", () => {
  let contaA: string;
  let contaB: string;
  let processoA: string;
  let processoB: string;
  let processoForaDoEscopo: string;

  async function novoProcesso(contaId: string, numero: string, tribunal = "TJSP") {
    const cliente = await criarCliente(contaId, { nome: "Cliente Fictício", documento: "", email: "", telefone: "", observacoes: "" });
    if (!cliente.ok) throw new Error(cliente.erro);
    const processo = await criarProcesso(contaId, {
      clienteId: cliente.valor.id, numero, tribunal, vara: "", assunto: "Ação fictícia", parteContraria: "",
    });
    if (!processo.ok) throw new Error(processo.erro);
    return processo.valor.id;
  }
  async function novoPrazo(contaId: string, processoId: string, extra: Record<string, unknown> = {}) {
    const prazo = await cadastrarPrazo(contaId, calculada(processoId, extra));
    if (!prazo.ok) throw new Error(prazo.erro);
    return prazo.valor;
  }

  beforeAll(async () => {
    [contaA, contaB] = await Promise.all([criarContaDeTeste("Conta A"), criarContaDeTeste("Conta B")]);
    [processoA, processoB, processoForaDoEscopo] = await Promise.all([
      novoProcesso(contaA, "0001234-03.2026.8.26.0100"),
      novoProcesso(contaB, "0001234-03.2026.8.26.0100"),
      novoProcesso(contaA, "0005678-06.2026.5.02.0001", "TJRJ"),
    ]);
  });
  afterAll(async () => {
    await Promise.all([apagarContaDeTeste(contaA), apagarContaDeTeste(contaB)]);
  });

  describe("cadastro e cálculo", () => {
    it("calcula, grava a data final e guarda o passo a passo com o aviso de cálculo auxiliar", async () => {
      const prazo = await novoPrazo(contaA, processoA);

      expect(prazo).toMatchObject({
        dataInicio: "2026-11-13", dataFinal: "2026-12-04", origemDataFinal: "calculada", status: "pendente", ultimaConferenciaEm: null,
      });
      expect(prazo.memoriaDoCalculo?.avisos[0]).toBe("Cálculo auxiliar, confira.");
      expect(prazo.memoriaDoCalculo?.passos.at(-1)).toBe("Data final: 04/12/2026 (sexta-feira).");
      expect(prazo.memoriaDoCalculo?.regrasAplicadas.length).toBeGreaterThan(0);
    });

    it("a prévia calcula sem gravar e usa os dias sem expediente cadastrados pela conta", async () => {
      const entrada = { dataEvento: "2026-06-01", tipoEvento: "intimacao", dias: 5, contagem: "uteis", emDobro: false };
      const antes = await previsualizarPrazo(contaA, processoA, entrada);
      expect(antes).toMatchObject({ ok: true, dataFinal: "2026-06-08" });

      expect((await cadastrarDiaSemExpediente(contaA, { tribunal: "TJSP", data: "2026-06-04", motivo: "Corpus Christi (portaria fictícia)" })).ok).toBe(true);
      expect(await previsualizarPrazo(contaA, processoA, entrada)).toMatchObject({ ok: true, dataFinal: "2026-06-09" });
      // O dia cadastrado pela conta A não muda o cálculo da conta B.
      expect(await previsualizarPrazo(contaB, processoB, entrada)).toMatchObject({ ok: true, dataFinal: "2026-06-08" });
      expect(await listarDiasSemExpediente(contaB)).toEqual([]);
    });

    it("recusa com segurança fora do escopo e aceita a data manual, marcada como manual", async () => {
      const recusa = await cadastrarPrazo(contaA, calculada(processoForaDoEscopo));
      expect(recusa.ok).toBe(false);
      if (!recusa.ok) expect(recusa.erro).toContain("Informe a data final manualmente.");

      const manual = await cadastrarPrazo(contaA, { origem: "manual", processoId: processoForaDoEscopo, descricao: "Recurso", dataFinal: "2026-12-01" });
      expect(manual.ok && manual.valor).toMatchObject({ dataFinal: "2026-12-01", origemDataFinal: "manual", dias: null, memoriaDoCalculo: null });
    });

    it("enquanto as regras forem pendentes, só salva a data calculada com a conferência declarada", async () => {
      expect(await cadastrarPrazo(contaA, calculada(processoA, { conferiNosAutos: undefined }))).toEqual({ ok: false, erro: CONFIRME_A_CONFERENCIA });
      expect(await cadastrarPrazo(contaA, calculada(processoA, { conferiNosAutos: "on" }))).toEqual({ ok: false, erro: CONFIRME_A_CONFERENCIA });
      // A prévia não exige nada: ela não grava.
      expect(await previsualizarPrazo(contaA, processoA, calculada(processoA))).toMatchObject({ ok: true });
    });

    it("recusa prazo de Juizado Especial e aceita a data manual", async () => {
      const cliente = await criarCliente(contaA, { nome: "Cliente do Juizado", documento: "", email: "", telefone: "", observacoes: "" });
      if (!cliente.ok) throw new Error(cliente.erro);
      const processo = await criarProcesso(contaA, {
        clienteId: cliente.valor.id, numero: "1002003-94.2026.8.26.0002", tribunal: "TJSP", vara: "2º Juizado Especial Cível",
        assunto: "Ação fictícia no juizado", parteContraria: "",
      });
      if (!processo.ok) throw new Error(processo.erro);

      const recusa = await previsualizarPrazo(contaA, processo.valor.id, calculada(processo.valor.id));
      expect(recusa.ok).toBe(false);
      if (!recusa.ok) expect(recusa.motivo).toContain("Juizado Especial");
      expect((await cadastrarPrazo(contaA, { origem: "manual", processoId: processo.valor.id, descricao: "Recurso inominado", dataFinal: "2026-12-01" })).ok).toBe(true);
    });

    it("valida a entrada com mensagens em português", async () => {
      expect(await cadastrarPrazo(contaA, calculada(processoA, { dias: 0 }))).toEqual({ ok: false, erro: "O prazo precisa ter pelo menos 1 dia." });
      expect(await cadastrarPrazo(contaA, calculada(processoA, { descricao: "" }))).toMatchObject({ ok: false });
      expect(await cadastrarPrazo(contaA, { origem: "manual", processoId: processoA, descricao: "Prazo", dataFinal: "31/12/2026" })).toEqual({ ok: false, erro: "Informe a data final." });
    });
  });

  describe("lista e filtros", () => {
    it("ordena por data final e separa próximos 7 dias, vencidos e cumpridos", async () => {
      const conta = await criarContaDeTeste("Conta dos filtros");
      const processo = await novoProcesso(conta, "1002003-94.2026.8.26.0002");
      const manual = (descricaoDoPrazo: string, dataFinal: string) =>
        cadastrarPrazo(conta, { origem: "manual", processoId: processo, descricao: descricaoDoPrazo, dataFinal });
      await manual("Distante", "2026-12-10");
      await manual("Vencido", "2026-11-10");
      await manual("Hoje", "2026-11-12");
      const cumprido = await manual("Cumprido", "2026-11-13");
      if (!cumprido.ok) throw new Error(cumprido.erro);
      await marcarComoCumprido(conta, cumprido.valor.id, agora);

      const nomes = async (filtro: Parameters<typeof listarPrazos>[1]) =>
        (await listarPrazos(conta, filtro, agora)).map((prazo) => prazo.descricao);
      expect(await nomes({})).toEqual(["Vencido", "Hoje", "Distante"]);
      expect(await nomes({ filtro: "proximos_7_dias" })).toEqual(["Hoje"]);
      expect(await nomes({ filtro: "vencidos" })).toEqual(["Vencido"]);
      expect(await nomes({ filtro: "cumpridos" })).toEqual(["Cumprido"]);
      expect((await listarPrazos(conta, { filtro: "vencidos" }, agora))[0].situacao).toMatchObject({ vencido: true, quando: "venceu há 2 dias" });
      await apagarContaDeTeste(conta);
    });
  });

  describe("conferência, cumprido e status honesto", () => {
    it("o 'li e conferi' grava data, hora e canal e muda o status para confirmado", async () => {
      const prazo = await novoPrazo(contaA, processoA);

      expect((await confirmarConferencia(contaA, prazo.id, "app", "usuario-ficticio", agora)).ok).toBe(true);

      const detalhe = await obterPrazo(contaA, prazo.id, agora);
      expect(detalhe).toMatchObject({ status: "confirmado", ultimaConferenciaEm: agora });
      expect(detalhe?.conferencias).toEqual([expect.objectContaining({ via: "app", em: agora })]);
      expect(detalhe?.situacao.conferencia).toBe("conferido hoje");
    });

    it("três dias depois, o status honesto volta a pedir conferência", async () => {
      const prazo = await novoPrazo(contaA, processoA);
      await confirmarConferencia(contaA, prazo.id, "email", null, agora);

      const tresDiasDepois = new Date("2026-11-15T15:00:00Z");
      expect((await obterPrazo(contaA, prazo.id, tresDiasDepois))?.situacao).toMatchObject({
        conferencia: "conferido há 3 dias", conferenciaAtrasada: true,
      });
    });

    it("cumprido sai das pendências; desfazer devolve para pendente e exige nova conferência", async () => {
      const prazo = await novoPrazo(contaA, processoA);
      await confirmarConferencia(contaA, prazo.id, "app", null, agora);

      await marcarComoCumprido(contaA, prazo.id, agora);
      expect((await listarPrazos(contaA, {}, agora)).some((item) => item.id === prazo.id)).toBe(false);
      expect((await obterPrazo(contaA, prazo.id, agora))?.status).toBe("cumprido");

      await desfazerCumprido(contaA, prazo.id);
      expect(await obterPrazo(contaA, prazo.id, agora)).toMatchObject({ status: "pendente", cumpridoEm: null, ultimaConferenciaEm: null });
    });
  });

  describe("edição", () => {
    it("mudar os dias recalcula, zera a conferência e registra o valor anterior e o novo", async () => {
      const prazo = await novoPrazo(contaA, processoA);
      await confirmarConferencia(contaA, prazo.id, "app", null, agora);

      const editado = await editarPrazo(contaA, prazo.id, calculada(processoA, { dias: 5 }));

      expect(editado).toEqual({ ok: true, valor: { conferenciaZerada: true } });
      const detalhe = await obterPrazo(contaA, prazo.id, agora);
      expect(detalhe).toMatchObject({ dataFinal: "2026-11-19", status: "pendente", ultimaConferenciaEm: null });
      expect(detalhe?.historico).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ campo: "dias", valorAnterior: "15", valorNovo: "5" }),
          expect.objectContaining({ campo: "dataFinal", valorAnterior: "2026-12-04", valorNovo: "2026-11-19" }),
        ]),
      );
    });

    it("mudar só a descrição não zera a conferência", async () => {
      const prazo = await novoPrazo(contaA, processoA);
      await confirmarConferencia(contaA, prazo.id, "app", null, agora);

      const editado = await editarPrazo(contaA, prazo.id, calculada(processoA, { descricao: "Contestação com reconvenção" }));

      expect(editado).toEqual({ ok: true, valor: { conferenciaZerada: false } });
      expect(await obterPrazo(contaA, prazo.id, agora)).toMatchObject({ status: "confirmado", ultimaConferenciaEm: agora, descricao: "Contestação com reconvenção" });
    });

    it("trocar para data manual também zera a conferência e fica marcado como manual", async () => {
      const prazo = await novoPrazo(contaA, processoA);
      await confirmarConferencia(contaA, prazo.id, "app", null, agora);

      await editarPrazo(contaA, prazo.id, { origem: "manual", processoId: processoA, descricao: "Contestação", dataFinal: "2026-12-07" });

      expect(await obterPrazo(contaA, prazo.id, agora)).toMatchObject({
        dataFinal: "2026-12-07", origemDataFinal: "manual", dias: null, status: "pendente", ultimaConferenciaEm: null,
      });
    });
  });

  describe("catálogo", () => {
    it("traz os 13 tipos do catálogo base", async () => {
      const tipos = await listarTiposDePrazo(contaB);

      expect(tipos).toHaveLength(13);
      expect(tipos.find((tipo) => tipo.id === "contestacao")).toMatchObject({ dias: 15, contagem: "uteis", origem: "catalogo", referencia: "CPC, art. 335" });
    });

    it("ajusta os dias de um tipo e cria um tipo próprio só para a conta, e desfaz", async () => {
      expect((await ajustarTipoDoCatalogo(contaA, "contestacao", { dias: 30, contagem: "uteis" })).ok).toBe(true);
      expect((await criarTipoDePrazo(contaA, { nome: "Memoriais", dias: 10, contagem: "uteis" })).ok).toBe(true);

      const daContaA = await listarTiposDePrazo(contaA);
      const ajustado = daContaA.find((tipo) => tipo.id === "contestacao");
      expect(ajustado).toMatchObject({ dias: 30, origem: "ajustado" });
      expect(daContaA.find((tipo) => tipo.nome === "Memoriais")).toMatchObject({ dias: 10, origem: "proprio" });
      expect((await listarTiposDePrazo(contaB)).find((tipo) => tipo.id === "contestacao")).toMatchObject({ dias: 15, origem: "catalogo" });

      // A conta B não consegue remover o ajuste da conta A.
      expect((await removerTipoDaConta(contaB, ajustado!.registroId!)).ok).toBe(false);
      expect((await removerTipoDaConta(contaA, ajustado!.registroId!)).ok).toBe(true);
      expect((await listarTiposDePrazo(contaA)).find((tipo) => tipo.id === "contestacao")).toMatchObject({ dias: 15, origem: "catalogo" });
    });

    it("recusa ajuste inválido e chave desconhecida", async () => {
      expect((await ajustarTipoDoCatalogo(contaA, "inexistente", { dias: 5, contagem: "uteis" })).ok).toBe(false);
      expect((await ajustarTipoDoCatalogo(contaA, "contestacao", { dias: 0, contagem: "uteis" })).ok).toBe(false);
    });
  });

  describe("isolamento entre contas", () => {
    it("a conta B não enxerga, não confere, não edita e não exclui prazos da conta A", async () => {
      const prazo = await novoPrazo(contaA, processoA);
      const naoEncontrado = { ok: false, erro: "Prazo não encontrado." };

      expect(await obterPrazo(contaB, prazo.id, agora)).toBeNull();
      expect((await listarPrazos(contaB, {}, agora)).some((item) => item.id === prazo.id)).toBe(false);
      expect(await confirmarConferencia(contaB, prazo.id, "app", null, agora)).toEqual(naoEncontrado);
      expect(await marcarComoCumprido(contaB, prazo.id, agora)).toEqual(naoEncontrado);
      expect(await desfazerCumprido(contaB, prazo.id)).toEqual(naoEncontrado);
      expect(await editarPrazo(contaB, prazo.id, calculada(processoB, { dias: 1 }))).toEqual(naoEncontrado);
      expect(await excluirPrazo(contaB, prazo.id)).toEqual(naoEncontrado);
      expect(await obterPrazo(contaA, prazo.id, agora)).toMatchObject({ status: "pendente", dias: 15 });
    });

    it("não cadastra prazo em processo de outra conta", async () => {
      expect(await cadastrarPrazo(contaB, calculada(processoA))).toEqual({ ok: false, erro: "Processo não encontrado." });
      expect(await previsualizarPrazo(contaB, processoA, calculada(processoA))).toMatchObject({ ok: false });
    });
  });
});
