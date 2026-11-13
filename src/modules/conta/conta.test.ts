import { describe, expect, it } from "vitest";
import { criarCliente, listarClientes } from "@/modules/clientes";
import { cadastrarPrazo, confirmarConferencia } from "@/modules/prazos";
import { criarProcesso } from "@/modules/processos";
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
}

async function sessaoDe(contaId: string) {
  const conta = await getPrisma().conta.findUniqueOrThrow({ where: { id: contaId }, select: { usuarioId: true, usuario: { select: { email: true } } } });
  return { contaId, usuarioId: conta.usuarioId, email: conta.usuario.email };
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

  it("só exclui com o e-mail certo; a exclusão apaga tudo da conta e nada das outras", async () => {
    const [contaA, contaB] = await Promise.all([criarContaDeTeste("Conta A"), criarContaDeTeste("Conta B")]);
    await Promise.all([popular(contaA, "Cliente da Conta A"), popular(contaB, "Cliente da Conta B")]);
    const sessaoA = await sessaoDe(contaA);

    expect((await excluirConta(sessaoA, "outro@exemplo.test")).ok).toBe(false);
    expect((await excluirConta(sessaoA, undefined)).ok).toBe(false);
    // Uma sessão não consegue apagar o usuário de outra conta.
    expect((await excluirConta({ ...sessaoA, contaId: contaB }, sessaoA.email)).ok).toBe(false);
    expect(await listarClientes(contaA)).toHaveLength(1);

    expect((await excluirConta(sessaoA, `  ${sessaoA.email.toUpperCase()} `)).ok).toBe(true);

    const prisma = getPrisma();
    expect(await obterConta(contaA)).toBeNull();
    expect(await prisma.user.count({ where: { id: sessaoA.usuarioId } })).toBe(0);
    for (const tabela of [prisma.cliente, prisma.processo, prisma.prazo, prisma.prazoConferencia] as const) {
      expect(await (tabela as typeof prisma.cliente).count({ where: { contaId: contaA } })).toBe(0);
    }
    expect(await listarClientes(contaB)).toHaveLength(1);
    await apagarContaDeTeste(contaB);
  });
});
