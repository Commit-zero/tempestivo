import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { apagarContaDeTeste, criarContaDeTeste } from "@/test/banco";
import { criarTarefa, excluirTarefa, moverTarefa, obterQuadro } from "./index";

const entrada = (titulo: string, extra: Record<string, unknown> = {}) => ({ titulo, descricao: "", limite: "", processoId: "", ...extra });

describe("tarefas (integração)", () => {
  let contaA: string;
  let contaB: string;

  async function nova(contaId: string, titulo: string) {
    const tarefa = await criarTarefa(contaId, entrada(titulo));
    if (!tarefa.ok) throw new Error(tarefa.erro);
    return tarefa.valor.id;
  }
  const titulos = async (contaId: string) => {
    const quadro = await obterQuadro(contaId);
    return { a_fazer: quadro.a_fazer.map((t) => t.titulo), fazendo: quadro.fazendo.map((t) => t.titulo), feito: quadro.feito.map((t) => t.titulo) };
  };

  beforeAll(async () => {
    [contaA, contaB] = await Promise.all([criarContaDeTeste("Conta A"), criarContaDeTeste("Conta B")]);
  });
  afterAll(async () => {
    await Promise.all([apagarContaDeTeste(contaA), apagarContaDeTeste(contaB)]);
  });

  it("a tarefa nova entra no fim de 'A fazer' e mover leva para o fim da outra coluna", async () => {
    const protocolar = await nova(contaA, "Protocolar petição");
    const ligar = await nova(contaA, "Ligar para o cliente");
    await nova(contaA, "Separar documentos");

    expect((await titulos(contaA)).a_fazer).toEqual(["Protocolar petição", "Ligar para o cliente", "Separar documentos"]);

    await moverTarefa(contaA, ligar, "fazendo");
    await moverTarefa(contaA, protocolar, "fazendo");
    expect(await titulos(contaA)).toEqual({ a_fazer: ["Separar documentos"], fazendo: ["Ligar para o cliente", "Protocolar petição"], feito: [] });

    await moverTarefa(contaA, ligar, "feito");
    expect((await titulos(contaA)).feito).toEqual(["Ligar para o cliente"]);
  });

  it("valida o título, a data limite, a coluna e o processo", async () => {
    expect(await criarTarefa(contaA, entrada("x"))).toEqual({ ok: false, erro: "Escreva o que precisa ser feito." });
    expect(await criarTarefa(contaA, entrada("Tarefa", { limite: "amanhã" }))).toEqual({ ok: false, erro: "Data limite inválida." });
    expect(await criarTarefa(contaA, entrada("Tarefa", { processoId: "processo-de-outra-conta" }))).toEqual({ ok: false, erro: "Processo não encontrado." });
    const id = await nova(contaA, "Tarefa com limite");
    expect(await moverTarefa(contaA, id, "arquivo")).toEqual({ ok: false, erro: "Coluna desconhecida." });
  });

  it("a conta B não enxerga, não move e não exclui tarefas da conta A", async () => {
    const id = await nova(contaA, "Só da conta A");

    expect(await titulos(contaB)).toEqual({ a_fazer: [], fazendo: [], feito: [] });
    expect(await moverTarefa(contaB, id, "feito")).toEqual({ ok: false, erro: "Tarefa não encontrada." });
    expect(await excluirTarefa(contaB, id)).toEqual({ ok: false, erro: "Tarefa não encontrada." });
    expect((await titulos(contaA)).a_fazer).toContain("Só da conta A");
    expect((await excluirTarefa(contaA, id)).ok).toBe(true);
  });
});
