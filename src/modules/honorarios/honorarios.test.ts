import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { criarCliente } from "@/modules/clientes";
import { criarProcesso } from "@/modules/processos";
import { apagarContaDeTeste, criarContaDeTeste } from "@/test/banco";
import { criarHonorario, definirPagamentoDaParcela, excluirHonorario, listarHonorarios, obterHonorario, resumoFinanceiro } from "./index";

// 12/11/2026 ao meio-dia em São Paulo.
const agora = new Date("2026-11-12T15:00:00Z");

describe("honorários (integração)", () => {
  let contaA: string;
  let contaB: string;
  let clienteA: string;
  let outroClienteA: string;
  let clienteB: string;
  let processoA: string;

  async function novoCliente(contaId: string, nome = "Cliente Fictício") {
    const cliente = await criarCliente(contaId, { nome, documento: "", email: "", telefone: "11912345678", observacoes: "" });
    if (!cliente.ok) throw new Error(cliente.erro);
    return cliente.valor.id;
  }
  const entrada = (clienteId: string, extra: Record<string, unknown> = {}) => ({
    clienteId, processoId: "", descricao: "Ação fictícia", valorTotal: "3.000,00", parcelas: "3", primeiroVencimento: "2026-10-10", ...extra,
  });
  async function novo(contaId: string, clienteId: string, extra: Record<string, unknown> = {}) {
    const honorario = await criarHonorario(contaId, entrada(clienteId, extra));
    if (!honorario.ok) throw new Error(honorario.erro);
    return honorario.valor;
  }

  beforeAll(async () => {
    [contaA, contaB] = await Promise.all([criarContaDeTeste("Conta A"), criarContaDeTeste("Conta B")]);
    [clienteA, outroClienteA, clienteB] = await Promise.all([novoCliente(contaA), novoCliente(contaA, "Outro Cliente"), novoCliente(contaB)]);
    const processo = await criarProcesso(contaA, {
      clienteId: clienteA, numero: "0001234-03.2026.8.26.0100", tribunal: "TJSP", vara: "", assunto: "Ação fictícia", parteContraria: "",
    });
    if (!processo.ok) throw new Error(processo.erro);
    processoA = processo.valor.id;
  });
  afterAll(async () => {
    await Promise.all([apagarContaDeTeste(contaA), apagarContaDeTeste(contaB)]);
  });

  it("cria as parcelas mensais e calcula total, recebido e em atraso", async () => {
    const criado = await novo(contaA, clienteA, { processoId: processoA });
    const honorario = await obterHonorario(contaA, criado.id, agora);

    expect(honorario?.parcelas.map((parcela) => [parcela.vencimento, parcela.valorCentavos, parcela.situacao])).toEqual([
      ["2026-10-10", 100_000, "em_atraso"],
      ["2026-11-10", 100_000, "em_atraso"],
      ["2026-12-10", 100_000, "a_vencer"],
    ]);
    expect(honorario).toMatchObject({ totalCentavos: 300_000, recebidoCentavos: 0, emAtrasoCentavos: 200_000, processo: { assunto: "Ação fictícia" } });
  });

  it("marca a parcela como paga e desfaz", async () => {
    const criado = await novo(contaA, clienteA);
    const parcelaId = criado.parcelas[0].id;

    expect(await definirPagamentoDaParcela(contaA, parcelaId, true, agora)).toEqual({ ok: true, valor: criado.id });
    expect(await obterHonorario(contaA, criado.id, agora)).toMatchObject({ recebidoCentavos: 100_000, emAtrasoCentavos: 100_000 });

    await definirPagamentoDaParcela(contaA, parcelaId, false, agora);
    expect(await obterHonorario(contaA, criado.id, agora)).toMatchObject({ recebidoCentavos: 0, emAtrasoCentavos: 200_000 });
  });

  it("valida valor, parcelas, data e vínculos", async () => {
    const erroDe = async (extra: Record<string, unknown>) => {
      const resultado = await criarHonorario(contaA, entrada(clienteA, extra));
      return resultado.ok ? null : resultado.erro;
    };
    expect(await erroDe({ valorTotal: "abc" })).toBe("Informe o valor total, por exemplo 1.500,00.");
    expect(await erroDe({ parcelas: "0" })).toBe("É preciso pelo menos 1 parcela.");
    expect(await erroDe({ parcelas: "61" })).toBe("Use no máximo 60 parcelas.");
    expect(await erroDe({ valorTotal: "0,02", parcelas: "3" })).toBe("O valor total é pequeno demais para essa quantidade de parcelas.");
    expect(await erroDe({ primeiroVencimento: "10/10/2026" })).toBe("Informe a data do primeiro vencimento.");
    expect(await erroDe({ clienteId: clienteB })).toBe("Cliente não encontrado.");
    expect((await criarHonorario(contaA, entrada(outroClienteA, { processoId: processoA }))).ok).toBe(false);
  });

  it("o resumo financeiro soma o que falta, o que atrasou e o que entrou no mês", async () => {
    const conta = await criarContaDeTeste("Conta do resumo");
    const cliente = await novoCliente(conta);
    const honorario = await novo(conta, cliente);
    await definirPagamentoDaParcela(conta, honorario.parcelas[0].id, true, agora);

    expect(await resumoFinanceiro(conta, agora)).toEqual({
      aReceberCentavos: 200_000, emAtrasoCentavos: 100_000, recebidoNoMesCentavos: 100_000, parcelasEmAtraso: 1,
    });
    // No mês seguinte, o que foi pago em novembro não conta mais como recebido no mês.
    expect((await resumoFinanceiro(conta, new Date("2026-12-05T15:00:00Z"))).recebidoNoMesCentavos).toBe(0);
    await apagarContaDeTeste(conta);
  });

  it("a conta B não enxerga, não recebe e não exclui honorários da conta A", async () => {
    const criado = await novo(contaA, clienteA);

    expect(await obterHonorario(contaB, criado.id, agora)).toBeNull();
    expect(await listarHonorarios(contaB, agora)).toEqual([]);
    expect(await definirPagamentoDaParcela(contaB, criado.parcelas[0].id, true, agora)).toEqual({ ok: false, erro: "Parcela não encontrada." });
    expect(await excluirHonorario(contaB, criado.id)).toEqual({ ok: false, erro: "Honorário não encontrado." });
    expect((await obterHonorario(contaA, criado.id, agora))?.recebidoCentavos).toBe(0);
    expect((await excluirHonorario(contaA, criado.id)).ok).toBe(true);
  });
});
