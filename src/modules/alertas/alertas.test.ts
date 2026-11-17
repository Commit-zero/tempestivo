import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { criarCliente } from "@/modules/clientes";
import { aceitarConviteDeSubstituto, atualizarConta } from "@/modules/conta";
import { cadastrarPrazo, confirmarConferencia, marcarComoCumprido, obterPrazo } from "@/modules/prazos";
import { criarProcesso } from "@/modules/processos";
import { criarFakeLogger } from "@/platform/logger";
import { criarFakeMailer, type Mailer } from "@/platform/mailer";
import { apagarContaDeTeste, criarContaDeTeste } from "@/test/banco";
import { getPrisma } from "@/platform/database";
import { confirmarPeloLink, enviarAlertasPendentes, LIMITE_DIARIO_POR_CONTA, obterPrazoDoLink } from "./index";

const SUBSTITUTO = "substituto@exemplo.test";
const APP_URL = "http://localhost:3000";
// 12/11/2026 ao meio-dia em São Paulo.
const dia = (data: string) => new Date(`${data}T15:00:00Z`);

describe("alertas (integração)", () => {
  let conta: string;
  let processoId: string;
  let sequencia = 0;

  // O job lê prazos de todas as contas do banco de teste; cada teste olha só os e-mails do seu prazo.
  async function rodar(agora: Date, mailer = criarFakeMailer()) {
    const resumo = await enviarAlertasPendentes({ mailer, logger: criarFakeLogger(), appUrl: APP_URL, agora });
    return { resumo, mailer };
  }
  async function novoPrazo(dataFinal: string) {
    sequencia += 1;
    const descricao = `Prazo fictício de alerta ${sequencia} ${Date.now()}`;
    const prazo = await cadastrarPrazo(conta, { origem: "manual", processoId, descricao, dataFinal });
    if (!prazo.ok) throw new Error(prazo.erro);
    return { id: prazo.valor.id, descricao };
  }
  const doPrazo = (mailer: ReturnType<typeof criarFakeMailer>, descricao: string) =>
    mailer.enviados.filter((email) => email.texto.includes(descricao));
  const tokenDe = (texto: string) => /\/conferir\/([A-Za-z0-9_-]+)/.exec(texto)?.[1] ?? "";

  beforeAll(async () => {
    conta = await criarContaDeTeste("Titular Fictícia");
    const cliente = await criarCliente(conta, { nome: "Cliente Fictício", documento: "", email: "", telefone: "", observacoes: "" });
    if (!cliente.ok) throw new Error(cliente.erro);
    const processo = await criarProcesso(conta, {
      clienteId: cliente.valor.id, numero: "0001234-03.2026.8.26.0100", tribunal: "TJSP", vara: "", assunto: "Ação fictícia de alerta", parteContraria: "",
    });
    if (!processo.ok) throw new Error(processo.erro);
    processoId = processo.valor.id;
  });
  afterAll(async () => {
    await apagarContaDeTeste(conta);
  });

  it("avisa o titular em cada camada, uma vez só, e o job repetido não duplica", async () => {
    const prazo = await novoPrazo("2026-11-17");

    const cincoDias = await rodar(dia("2026-11-12"));
    expect(doPrazo(cincoDias.mailer, prazo.descricao)).toHaveLength(1);
    expect(doPrazo(cincoDias.mailer, prazo.descricao)[0]).toMatchObject({ assunto: `Prazo vence em 5 dias: ${prazo.descricao}` });
    expect(doPrazo(cincoDias.mailer, prazo.descricao)[0].texto).toContain("Cálculo auxiliar");

    expect(doPrazo((await rodar(dia("2026-11-12"))).mailer, prazo.descricao)).toHaveLength(0);
    // Sexta-feira: faltam 2 dias úteis (segunda e terça), então o aviso d2 sai antes do fim de semana.
    expect(doPrazo((await rodar(dia("2026-11-13"))).mailer, prazo.descricao).map((email) => email.assunto)).toEqual([`Prazo vence em 4 dias: ${prazo.descricao}`]);
    expect(doPrazo((await rodar(dia("2026-11-15"))).mailer, prazo.descricao)).toHaveLength(0);
    expect(doPrazo((await rodar(dia("2026-11-16"))).mailer, prazo.descricao).map((email) => email.assunto)).toEqual([`Prazo vence amanhã: ${prazo.descricao}`]);
    expect(doPrazo((await rodar(dia("2026-11-17"))).mailer, prazo.descricao).map((email) => email.assunto)).toEqual([`Prazo vence hoje: ${prazo.descricao}`]);
    expect(doPrazo((await rodar(dia("2026-11-18"))).mailer, prazo.descricao)).toHaveLength(0);
  });

  it("não avisa prazo cumprido nem prazo a mais de 5 dias", async () => {
    const cumprido = await novoPrazo("2026-11-14");
    await marcarComoCumprido(conta, cumprido.id);
    const distante = await novoPrazo("2026-11-30");

    const { mailer } = await rodar(dia("2026-11-12"));

    expect(doPrazo(mailer, cumprido.descricao)).toHaveLength(0);
    expect(doPrazo(mailer, distante.descricao)).toHaveLength(0);
  });

  it("na véspera sem conferência, avisa o substituto que aceitou, só com a data; com conferência, não", async () => {
    const convite = criarFakeMailer();
    await atualizarConta(conta, { nome: "Titular Fictícia", substitutoNome: "Colega Fictício", substitutoEmail: SUBSTITUTO }, { mailer: convite, appUrl: APP_URL });
    const semConferir = await novoPrazo("2026-11-13");
    const conferido = await novoPrazo("2026-11-13");
    await confirmarConferencia(conta, conferido.id, "app", null, dia("2026-11-12"));

    // Antes do aceite, o substituto não recebe nada.
    expect((await rodar(dia("2026-11-12"))).mailer.enviados.some((email) => email.para === SUBSTITUTO)).toBe(false);
    await getPrisma().alerta.deleteMany({ where: { contaId: conta, destino: "substituto" } });

    const token = /\/substituto\/([A-Za-z0-9_-]+)/.exec(convite.enviados[0].texto)?.[1] ?? "";
    expect((await aceitarConviteDeSubstituto(token)).ok).toBe(true);
    const { mailer } = await rodar(dia("2026-11-12"));

    const escaladas = mailer.enviados.filter((email) => email.para === SUBSTITUTO);
    expect(escaladas).toHaveLength(1);
    expect(escaladas[0].assunto).toBe("Prazo sem conferência de Titular Fictícia: vence amanhã");
    // O substituto é terceiro: nada do processo, do cliente ou do ato.
    expect(escaladas[0].texto).toContain("13/11/2026");
    expect(escaladas[0].texto).not.toContain(semConferir.descricao);
    expect(escaladas[0].texto).not.toContain("Ação fictícia de alerta");
    expect(escaladas[0].texto).not.toContain("/conferir/");
    await atualizarConta(conta, { nome: "Titular Fictícia", substitutoNome: "", substitutoEmail: "" }, { mailer: criarFakeMailer(), appUrl: APP_URL });
  });

  it("não avisa quem ainda não confirmou o próprio e-mail", async () => {
    const outra = await criarContaDeTeste("Sem Confirmação");
    await getPrisma().user.updateMany({ where: { conta: { id: outra } }, data: { emailVerified: false } });
    const cliente = await criarCliente(outra, { nome: "Cliente Fictício", documento: "", email: "", telefone: "", observacoes: "" });
    if (!cliente.ok) throw new Error(cliente.erro);
    const processo = await criarProcesso(outra, {
      clienteId: cliente.valor.id, numero: "0001234-03.2026.8.26.0100", tribunal: "TJSP", vara: "", assunto: "Ação fictícia", parteContraria: "",
    });
    if (!processo.ok) throw new Error(processo.erro);
    const descricao = `Prazo de conta sem confirmação ${Date.now()}`;
    await cadastrarPrazo(outra, { origem: "manual", processoId: processo.valor.id, descricao, dataFinal: "2026-11-13" });

    expect(doPrazo((await rodar(dia("2026-11-12"))).mailer, descricao)).toHaveLength(0);
    await apagarContaDeTeste(outra);
  });

  it("respeita o teto diário de e-mails por conta e deixa o resto para depois", async () => {
    const outra = await criarContaDeTeste("Conta com muitos prazos");
    const cliente = await criarCliente(outra, { nome: "Cliente Fictício", documento: "", email: "", telefone: "", observacoes: "" });
    if (!cliente.ok) throw new Error(cliente.erro);
    const processo = await criarProcesso(outra, {
      clienteId: cliente.valor.id, numero: "0001234-03.2026.8.26.0100", tribunal: "TJSP", vara: "", assunto: "Ação fictícia", parteContraria: "",
    });
    if (!processo.ok) throw new Error(processo.erro);
    const marca = `Prazo em massa ${Date.now()}`;
    for (let indice = 0; indice < LIMITE_DIARIO_POR_CONTA + 5; indice += 1) {
      await cadastrarPrazo(outra, { origem: "manual", processoId: processo.valor.id, descricao: `${marca} ${indice}`, dataFinal: "2026-11-13" });
    }

    const { resumo, mailer } = await rodar(dia("2026-11-12"));

    expect(doPrazo(mailer, marca)).toHaveLength(LIMITE_DIARIO_POR_CONTA);
    expect(resumo.limitados).toBeGreaterThanOrEqual(5);
    await apagarContaDeTeste(outra);
  });

  it("para no orçamento de tempo e informa quantos prazos ficaram para a próxima execução", async () => {
    await novoPrazo("2026-11-13");
    let instante = 0;
    const resumo = await enviarAlertasPendentes({
      mailer: criarFakeMailer(), logger: criarFakeLogger(), appUrl: APP_URL, agora: dia("2026-11-12"),
      tempoMaximoMs: 10, relogio: () => (instante += 20),
    });

    expect(resumo.enviados).toBe(0);
    expect(resumo.adiados).toBe(resumo.analisados);
  });

  it("se o envio falha, a reserva é liberada e a próxima execução tenta de novo", async () => {
    const prazo = await novoPrazo("2026-11-14");
    const quebrado: Mailer = {
      async enviar(email) {
        if (email.texto.includes(prazo.descricao)) throw new Error("SMTP fora do ar");
      },
    };

    const primeira = await enviarAlertasPendentes({ mailer: quebrado, logger: criarFakeLogger(), appUrl: APP_URL, agora: dia("2026-11-12") });
    expect(primeira.falhas).toBeGreaterThanOrEqual(1);

    expect(doPrazo((await rodar(dia("2026-11-12"))).mailer, prazo.descricao)).toHaveLength(1);
  });

  it("o link do e-mail mostra o prazo sem registrar nada, confirma uma vez só e expira", async () => {
    const prazo = await novoPrazo("2026-11-14");
    const { mailer } = await rodar(dia("2026-11-12"));
    const token = tokenDe(doPrazo(mailer, prazo.descricao)[0].texto);
    expect(token.length).toBeGreaterThan(30);

    // Abrir o link (como faz um antivírus de e-mail) não confirma nada.
    expect(await obterPrazoDoLink(token, dia("2026-11-12"))).toMatchObject({ descricao: prazo.descricao, dataFinal: "2026-11-14", jaConferidoPorEsteLink: false });
    expect((await obterPrazo(conta, prazo.id))?.status).toBe("pendente");

    expect((await confirmarPeloLink(token, dia("2026-11-12"))).ok).toBe(true);
    // Depois de usado, o link (que pode ter sido encaminhado) não mostra mais os dados.
    expect(await obterPrazoDoLink(token, dia("2026-11-12"))).toEqual({ jaConferidoPorEsteLink: true });
    const detalhe = await obterPrazo(conta, prazo.id);
    expect(detalhe?.status).toBe("confirmado");
    expect(detalhe?.conferencias).toEqual([expect.objectContaining({ via: "email" })]);

    expect(await confirmarPeloLink(token, dia("2026-11-12"))).toEqual({ ok: false, erro: "Este link já foi usado." });
    expect((await obterPrazo(conta, prazo.id))?.conferencias).toHaveLength(1);
  });

  it("recusa token expirado, inexistente ou malformado", async () => {
    const prazo = await novoPrazo("2026-11-14");
    const { mailer } = await rodar(dia("2026-11-12"));
    const token = tokenDe(doPrazo(mailer, prazo.descricao)[0].texto);

    expect(await obterPrazoDoLink(token, dia("2026-11-15"))).not.toBeNull();
    expect(await obterPrazoDoLink(token, dia("2026-11-16"))).toBeNull();
    expect((await confirmarPeloLink(token, dia("2026-11-16"))).ok).toBe(false);
    expect(await obterPrazoDoLink("token-que-nao-existe-0123456789abcdef", dia("2026-11-12"))).toBeNull();
    expect(await obterPrazoDoLink("../../etc/passwd", dia("2026-11-12"))).toBeNull();
    expect((await obterPrazo(conta, prazo.id))?.status).toBe("pendente");
  });
});
