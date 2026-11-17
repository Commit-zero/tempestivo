import { describe, expect, it } from "vitest";
import { criarAudiencia } from "@/modules/audiencias";
import { criarCliente, listarClientes } from "@/modules/clientes";
import { criarHonorario } from "@/modules/honorarios";
import { cadastrarPrazo, confirmarConferencia } from "@/modules/prazos";
import { criarProcesso } from "@/modules/processos";
import { criarTarefa } from "@/modules/tarefas";
import { getPrisma } from "@/platform/database";
import { apagarContaDeTeste, criarContaDeTeste } from "@/test/banco";
import { atualizarConta, excluirConta, exportarDadosDaConta, obterConta } from "./index";

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

async function sessaoDe(contaId: string) {
  const conta = await getPrisma().conta.findUniqueOrThrow({ where: { id: contaId }, select: { usuarioId: true } });
  return { contaId, usuarioId: conta.usuarioId };
}

describe("conta (integração)", () => {
  it("valida o substituto: e-mail válido e obrigatório quando há nome", async () => {
    const conta = await criarContaDeTeste();

    expect(await atualizarConta(conta, { nome: "Escritório", substitutoNome: "Colega", substitutoEmail: "" })).toEqual({ ok: false, erro: "Informe o e-mail do substituto." });
    expect(await atualizarConta(conta, { nome: "Escritório", substitutoNome: "", substitutoEmail: "nao-e-email" })).toEqual({ ok: false, erro: "E-mail do substituto inválido." });
    expect((await atualizarConta(conta, { nome: "Escritório", substitutoNome: "Colega", substitutoEmail: "colega@exemplo.test" })).ok).toBe(true);
    expect(await obterConta(conta)).toMatchObject({ nome: "Escritório", substitutoEmail: "colega@exemplo.test" });
    await apagarContaDeTeste(conta);
  });

  it("exporta só os dados da própria conta, sem contaId, sem senha e sem token", async () => {
    const [contaA, contaB] = await Promise.all([criarContaDeTeste("Conta A"), criarContaDeTeste("Conta B")]);
    await Promise.all([popular(contaA, "Cliente da Conta A"), popular(contaB, "Cliente da Conta B")]);

    const exportacao = await exportarDadosDaConta(contaA, new Date("2026-11-12T15:00:00Z"));

    expect(exportacao).toMatchObject({ formato: "tempestivo-exportacao-v1", geradoEm: "2026-11-12T15:00:00.000Z" });
    expect(exportacao.clientes.map((cliente) => cliente.nome)).toEqual(["Cliente da Conta A"]);
    expect(exportacao.processos).toHaveLength(1);
    expect(exportacao.prazos).toHaveLength(1);
    expect(exportacao.conferencias).toHaveLength(1);
    const texto = JSON.stringify(exportacao);
    expect(texto).not.toContain("Cliente da Conta B");
    expect(texto).not.toContain("contaId");
    expect(texto).not.toContain("password");
    expect(texto).not.toContain("tokenHash");
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

    expect((await excluirConta(sessaoA)).ok).toBe(true);

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
