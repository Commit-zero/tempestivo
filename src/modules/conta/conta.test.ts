import { describe, expect, it } from "vitest";
import { criarAudiencia } from "@/modules/audiencias";
import { criarCliente, listarClientes } from "@/modules/clientes";
import { criarHonorario } from "@/modules/honorarios";
import { cadastrarPrazo, confirmarConferencia } from "@/modules/prazos";
import { criarProcesso } from "@/modules/processos";
import { criarTarefa } from "@/modules/tarefas";
import { getPrisma } from "@/platform/database";
import { apagarContaDeTeste, criarContaDeTeste } from "@/test/banco";
import { criarFakeMailer } from "@/platform/mailer";
import {
  aceitarConviteDeSubstituto, ativarAgenda, atualizarConta, definirMargemDeSeguranca, excluirConta, exportarDadosDaConta, obterConta,
  obterConviteDeSubstituto,
} from "./index";

const agora = new Date("2026-11-12T15:00:00Z");
const deps = () => ({ mailer: criarFakeMailer(), appUrl: "http://localhost:3000", agora });
const tokenDe = (texto: string) => /\/substituto\/([A-Za-z0-9_-]+)/.exec(texto)?.[1] ?? "";

async function popular(contaId: string, nomeDoCliente: string) {
  const cliente = await criarCliente(contaId, { nome: nomeDoCliente, documento: "", email: "", telefone: "", observacoes: "" });
  if (!cliente.ok) throw new Error(cliente.erro);
  const processo = await criarProcesso(contaId, {
    clienteId: cliente.valor.id, numero: "0001234-03.2026.8.26.0100", tribunal: "TJSP", vara: "", assunto: "Ação fictícia", parteContraria: "",
  });
  if (!processo.ok) throw new Error(processo.erro);
  const prazo = await cadastrarPrazo(contaId, { origem: "manual", processoId: processo.valor.id, descricao: "Prazo fictício", dataFinal: "2026-12-01" });
  if (!prazo.ok) throw new Error(prazo.erro);
  await confirmarConferencia(contaId, prazo.valor.id, "app", "usuario-ficticio");
  const honorario = await criarHonorario(contaId, {
    clienteId: cliente.valor.id, processoId: "", descricao: "Honorário fictício", valorTotal: "100,00", parcelas: "2", primeiroVencimento: "2026-12-10",
  });
  if (!honorario.ok) throw new Error(honorario.erro);
  await criarAudiencia(contaId, {
    processoId: processo.valor.id, tipo: "Conciliação", data: "2026-12-01", hora: "14:00", duracaoMin: "60", local: "", linkVirtual: "", observacoes: "",
  });
  await criarTarefa(contaId, { titulo: "Tarefa fictícia", descricao: "", limite: "", processoId: "" });
  await getPrisma().alerta.create({ data: { contaId, prazoId: prazo.valor.id, chave: `${prazo.valor.id}:d5:teste`, camada: "d5", destino: "titular" } });
}

/** Liga o segundo fator no banco, com valores fictícios fáceis de procurar. */
async function ligarSegundoFator(usuarioId: string) {
  await getPrisma().user.update({ where: { id: usuarioId }, data: { twoFactorEnabled: true } });
  await getPrisma().twoFactor.create({
    data: { id: `2fa-${usuarioId}`, userId: usuarioId, secret: "SEGREDO-FICTICIO-DO-2FA", backupCodes: "CODIGOS-FICTICIOS-DO-2FA" },
  });
}

async function sessaoDe(contaId: string) {
  const conta = await getPrisma().conta.findUniqueOrThrow({ where: { id: contaId }, select: { usuarioId: true } });
  return { contaId, usuarioId: conta.usuarioId };
}

describe("conta (integração)", () => {
  it("valida o substituto: e-mail válido e obrigatório quando há nome", async () => {
    const conta = await criarContaDeTeste();

    expect(await atualizarConta(conta, { nome: "Escritório", substitutoNome: "Colega", substitutoEmail: "" }, deps())).toEqual({ ok: false, erro: "Informe o e-mail do substituto." });
    expect(await atualizarConta(conta, { nome: "Escritório", substitutoNome: "", substitutoEmail: "nao-e-email" }, deps())).toEqual({ ok: false, erro: "E-mail do substituto inválido." });
    expect((await atualizarConta(conta, { nome: "Escritório", substitutoNome: "Colega", substitutoEmail: "Colega@Exemplo.test" }, deps())).ok).toBe(true);
    expect(await obterConta(conta)).toMatchObject({ nome: "Escritório", substitutoEmail: "colega@exemplo.test", substitutoConfirmadoEm: null });
    await apagarContaDeTeste(conta);
  });

  it("convida o substituto, que só passa a valer depois de aceitar pelo link, uma vez", async () => {
    const conta = await criarContaDeTeste("Titular Fictícia");
    const primeiro = deps();

    expect(await atualizarConta(conta, { nome: "Escritório", substitutoNome: "Colega", substitutoEmail: "colega@exemplo.test" }, primeiro))
      .toEqual({ ok: true, valor: { conviteEnviado: true } });
    const [convite] = primeiro.mailer.enviados;
    expect(convite).toMatchObject({ para: "colega@exemplo.test", assunto: "Titular Fictícia indicou você como advogado substituto no Tempestivo" });
    const token = tokenDe(convite.texto);

    // Abrir o link não aceita nada.
    expect(await obterConviteDeSubstituto(token, agora)).toEqual({ titular: "Titular Fictícia", substituto: "Colega" });
    expect((await obterConta(conta))?.substitutoConfirmadoEm).toBeNull();

    expect((await aceitarConviteDeSubstituto(token, agora)).ok).toBe(true);
    expect((await obterConta(conta))?.substitutoConfirmadoEm).toEqual(agora);
    expect((await aceitarConviteDeSubstituto(token, agora)).ok).toBe(false);
    expect(await obterConviteDeSubstituto(token, agora)).toBeNull();

    // Salvar sem mudar o e-mail não reenvia nem desfaz o aceite; trocar o e-mail zera e convida de novo.
    const semMudanca = deps();
    expect(await atualizarConta(conta, { nome: "Outro nome", substitutoNome: "Colega", substitutoEmail: "colega@exemplo.test" }, semMudanca))
      .toEqual({ ok: true, valor: { conviteEnviado: false } });
    expect(semMudanca.mailer.enviados).toHaveLength(0);
    expect((await obterConta(conta))?.substitutoConfirmadoEm).toEqual(agora);
    await atualizarConta(conta, { nome: "Outro nome", substitutoNome: "Outro", substitutoEmail: "outro@exemplo.test" }, deps());
    expect((await obterConta(conta))?.substitutoConfirmadoEm).toBeNull();
    await apagarContaDeTeste(conta);
  });

  it("o convite expira em 7 dias e o token malformado é recusado", async () => {
    const conta = await criarContaDeTeste();
    const envio = deps();
    await atualizarConta(conta, { nome: "Escritório", substitutoNome: "", substitutoEmail: "colega@exemplo.test" }, envio);
    const token = tokenDe(envio.mailer.enviados[0].texto);

    expect(await obterConviteDeSubstituto(token, new Date("2026-11-19T14:00:00Z"))).not.toBeNull();
    expect(await obterConviteDeSubstituto(token, new Date("2026-11-19T16:00:00Z"))).toBeNull();
    expect((await aceitarConviteDeSubstituto(token, new Date("2026-11-20T15:00:00Z"))).ok).toBe(false);
    expect(await obterConviteDeSubstituto("../../etc/passwd", agora)).toBeNull();
    await apagarContaDeTeste(conta);
  });

  it("limita as trocas de substituto para o Tempestivo não virar disparador de e-mails", async () => {
    const conta = await criarContaDeTeste();
    const enviar = (indice: number) =>
      atualizarConta(conta, { nome: "Escritório", substitutoNome: "", substitutoEmail: `colega${indice}@exemplo.test` }, deps());

    for (const indice of [1, 2, 3]) expect((await enviar(indice)).ok).toBe(true);
    expect(await enviar(4)).toEqual({ ok: false, erro: "Você já trocou de substituto várias vezes hoje. Tente de novo amanhã." });
    await apagarContaDeTeste(conta);
  });

  it("exporta só os dados da própria conta, sem contaId, sem senha e sem token", async () => {
    const [contaA, contaB] = await Promise.all([criarContaDeTeste("Conta A"), criarContaDeTeste("Conta B")]);
    await Promise.all([popular(contaA, "Cliente da Conta A"), popular(contaB, "Cliente da Conta B")]);
    await definirMargemDeSeguranca(contaA, 4);
    const agenda = await ativarAgenda(contaA, new Date("2026-11-12T14:00:00Z"));
    if (!agenda.ok) throw new Error(agenda.erro);

    await ligarSegundoFator((await sessaoDe(contaA)).usuarioId);
    const exportacao = await exportarDadosDaConta(contaA, new Date("2026-11-12T15:00:00Z"));

    expect(exportacao).toMatchObject({ formato: "tempestivo-exportacao-v1", geradoEm: "2026-11-12T15:00:00.000Z" });
    expect(exportacao.clientes.map((cliente) => cliente.nome)).toEqual(["Cliente da Conta A"]);
    expect(exportacao.processos).toHaveLength(1);
    expect(exportacao.prazos).toHaveLength(1);
    expect(exportacao.conferencias).toHaveLength(1);
    expect(exportacao.alertas).toEqual([expect.objectContaining({ camada: "d5", destino: "titular" })]);
    expect(exportacao.sessoes).toEqual([]);
    // Preferências da conta entram; o link da agenda (credencial), não.
    expect(exportacao.conta).toMatchObject({ margemDeSegurancaDiasUteis: 4, agendaAtivadaEm: new Date("2026-11-12T14:00:00Z") });
    const texto = JSON.stringify(exportacao);
    expect(texto).not.toContain(agenda.valor.token);
    expect(texto).not.toContain("Cliente da Conta B");
    expect(texto).not.toContain("contaId");
    expect(texto).not.toContain("password");
    expect(texto).not.toContain("tokenHash");
    expect(texto).not.toContain("SEGREDO-FICTICIO-DO-2FA");
    expect(texto).not.toContain("CODIGOS-FICTICIOS-DO-2FA");
    await Promise.all([apagarContaDeTeste(contaA), apagarContaDeTeste(contaB)]);
  });

  it("a exclusão apaga tudo da conta e nada das outras; uma sessão não apaga outra conta", async () => {
    const [contaA, contaB] = await Promise.all([criarContaDeTeste("Conta A"), criarContaDeTeste("Conta B")]);
    await Promise.all([popular(contaA, "Cliente da Conta A"), popular(contaB, "Cliente da Conta B")]);
    const sessaoA = await sessaoDe(contaA);
    const sessaoB = await sessaoDe(contaB);

    // O usuário de uma conta com o contaId de outra não apaga nada.
    expect((await excluirConta({ contaId: contaB, usuarioId: sessaoA.usuarioId })).ok).toBe(false);
    expect((await excluirConta({ contaId: contaA, usuarioId: sessaoB.usuarioId })).ok).toBe(false);
    expect(await listarClientes(contaA)).toHaveLength(1);

    await ligarSegundoFator(sessaoA.usuarioId);
    expect((await excluirConta(sessaoA)).ok).toBe(true);
    expect(await getPrisma().twoFactor.count({ where: { userId: sessaoA.usuarioId } })).toBe(0);

    const prisma = getPrisma();
    expect(await obterConta(contaA)).toBeNull();
    expect(await prisma.user.count({ where: { id: sessaoA.usuarioId } })).toBe(0);
    const restantes = await Promise.all([
      prisma.cliente.count({ where: { contaId: contaA } }),
      prisma.processo.count({ where: { contaId: contaA } }),
      prisma.prazo.count({ where: { contaId: contaA } }),
      prisma.prazoConferencia.count({ where: { contaId: contaA } }),
      prisma.honorario.count({ where: { contaId: contaA } }),
      prisma.parcela.count({ where: { contaId: contaA } }),
      prisma.audiencia.count({ where: { contaId: contaA } }),
      prisma.tarefa.count({ where: { contaId: contaA } }),
      prisma.alerta.count({ where: { contaId: contaA } }),
    ]);
    expect(restantes).toEqual([0, 0, 0, 0, 0, 0, 0, 0, 0]);
    expect(await listarClientes(contaB)).toHaveLength(1);
    await apagarContaDeTeste(contaB);
  });
});
