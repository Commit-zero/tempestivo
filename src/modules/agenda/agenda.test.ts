import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { criarAudiencia } from "@/modules/audiencias";
import { criarCliente } from "@/modules/clientes";
import { ativarAgenda, definirMargemDeSeguranca, desativarAgenda } from "@/modules/conta";
import { cadastrarPrazo, marcarComoCumprido, obterPrazo } from "@/modules/prazos";
import { criarProcesso } from "@/modules/processos";
import { apagarContaDeTeste, criarContaDeTeste } from "@/test/banco";
import { gerarFeedDaAgenda } from "./index";

const APP = "https://tempestivo.exemplo";
// 12/11/2026 ao meio-dia em São Paulo.
const agora = new Date("2026-11-12T15:00:00Z");
const linhas = (ics: string) => ics.replace(/\r\n /g, "").split("\r\n");

describe("agenda assinável (integração)", () => {
  let conta: string;
  let outra: string;
  let processoId: string;
  let token: string;

  beforeAll(async () => {
    [conta, outra] = await Promise.all([criarContaDeTeste("Conta da agenda"), criarContaDeTeste("Outra conta")]);
    const cliente = await criarCliente(conta, { nome: "Maria Cliente Sigilosa", documento: "", email: "", telefone: "", observacoes: "" });
    if (!cliente.ok) throw new Error(cliente.erro);
    const processo = await criarProcesso(conta, {
      clienteId: cliente.valor.id, numero: "0001234-03.2026.8.26.0100", tribunal: "TJSP", vara: "", assunto: "Divórcio de Maria",
      parteContraria: "João Parte Contrária",
    });
    if (!processo.ok) throw new Error(processo.erro);
    processoId = processo.valor.id;
    const ativada = await ativarAgenda(conta, agora);
    if (!ativada.ok) throw new Error(ativada.erro);
    token = ativada.valor.token;
  });
  afterAll(async () => {
    await Promise.all([apagarContaDeTeste(conta), apagarContaDeTeste(outra)]);
  });

  it("publica o vencimento e a meta interna de cada prazo em aberto, com lembretes", async () => {
    const prazo = await cadastrarPrazo(conta, { origem: "manual", processoId, descricao: "Contestação", dataFinal: "2026-12-04" });
    if (!prazo.ok) throw new Error(prazo.erro);

    const ics = await gerarFeedDaAgenda(token, APP, agora);
    const conteudo = linhas(ics!);

    expect(conteudo).toEqual(expect.arrayContaining([
      "X-WR-CALNAME:Tempestivo: prazos e audiências",
      `UID:prazo-${prazo.valor.id}-vencimento@tempestivo`,
      "SUMMARY:Vence: Contestação",
      "DTSTART;VALUE=DATE:20261204",
      `UID:prazo-${prazo.valor.id}-meta@tempestivo`,
      "SUMMARY:Meta interna: Contestação",
      // Margem padrão de 2 dias úteis antes da sexta 04/12: quarta 02/12.
      "DTSTART;VALUE=DATE:20261202",
      "TRIGGER:-PT15H",
      `URL:${APP}/prazos/${prazo.valor.id}`,
    ]));
    // O provedor do calendário não recebe nome de cliente, de parte nem o assunto.
    expect(ics).not.toContain("Maria");
    expect(ics).not.toContain("João");
    expect(ics).toContain("0001234-03.2026.8.26.0100");
  });

  it("a meta acompanha a margem da conta, e margem zero não gera meta", async () => {
    const prazo = await cadastrarPrazo(conta, { origem: "manual", processoId, descricao: "Réplica", dataFinal: "2026-12-11" });
    if (!prazo.ok) throw new Error(prazo.erro);

    await definirMargemDeSeguranca(conta, 4);
    expect((await obterPrazo(conta, prazo.valor.id, agora))?.situacao.metaInterna).toBe("2026-12-07");

    await definirMargemDeSeguranca(conta, 0);
    expect(linhas((await gerarFeedDaAgenda(token, APP, agora))!)).not.toContain(`UID:prazo-${prazo.valor.id}-meta@tempestivo`);
    await definirMargemDeSeguranca(conta, 2);
  });

  it("inclui as próximas audiências e deixa de fora os prazos cumpridos", async () => {
    await criarAudiencia(conta, {
      processoId, tipo: "Conciliação", data: "2026-11-20", hora: "14:30", duracaoMin: "60", local: "Fórum João Mendes", linkVirtual: "", observacoes: "",
    });
    const cumprido = await cadastrarPrazo(conta, { origem: "manual", processoId, descricao: "Já cumprido", dataFinal: "2026-12-01" });
    if (!cumprido.ok) throw new Error(cumprido.erro);
    await marcarComoCumprido(conta, cumprido.valor.id, agora);

    const ics = (await gerarFeedDaAgenda(token, APP, agora))!;

    expect(linhas(ics)).toEqual(expect.arrayContaining(["SUMMARY:Audiência: Conciliação", "DTSTART:20261120T173000Z", "LOCATION:Fórum João Mendes"]));
    expect(ics).not.toContain("Já cumprido");
  });

  it("valida a margem", async () => {
    expect((await definirMargemDeSeguranca(conta, 11)).ok).toBe(false);
    expect((await definirMargemDeSeguranca(conta, -1)).ok).toBe(false);
    expect((await definirMargemDeSeguranca(conta, "dois")).ok).toBe(false);
  });

  it("trocar o link desliga o anterior; desativar desliga tudo; link de outra conta não vê nada", async () => {
    const outraAgenda = await ativarAgenda(outra, agora);
    if (!outraAgenda.ok) throw new Error(outraAgenda.erro);
    expect(await gerarFeedDaAgenda(outraAgenda.valor.token, APP, agora)).not.toContain("Contestação");

    const nova = await ativarAgenda(conta, agora);
    if (!nova.ok) throw new Error(nova.erro);
    expect(await gerarFeedDaAgenda(token, APP, agora)).toBeNull();
    expect(await gerarFeedDaAgenda(nova.valor.token, APP, agora)).toContain("Contestação");

    await desativarAgenda(conta);
    expect(await gerarFeedDaAgenda(nova.valor.token, APP, agora)).toBeNull();
    expect(await gerarFeedDaAgenda("../../etc/passwd", APP, agora)).toBeNull();
  });
});
