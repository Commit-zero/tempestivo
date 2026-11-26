import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { criarCliente } from "@/modules/clientes";
import { cadastrarPrazo, marcarComoCumprido } from "@/modules/prazos";
import { criarProcesso, mudarStatusDoProcesso } from "@/modules/processos";
import { apagarContaDeTeste, criarContaDeTeste } from "@/test/banco";
import { lerPlanilha, valores } from "@/test/ler-planilha";
import { GET, HEAD } from "./route";

// A rota de verdade, com Postgres; só a sessão é simulada (a de verdade é testada nas telas).
const sessao = vi.hoisted(() => ({ atual: null as { contaId: string } | null }));
vi.mock("@/platform/auth", () => ({ obterSessao: async () => sessao.atual }));

let contaId: string;
beforeAll(async () => {
  contaId = await criarContaDeTeste("Conta da rota");
  for (const nome of ["Alice Fictícia", "Bruno Fictício"]) {
    const criado = await criarCliente(contaId, { nome, documento: "", email: "", telefone: "", observacoes: "" });
    if (!criado.ok) throw new Error(criado.erro);
  }
  const cliente = await criarCliente(contaId, { nome: "Carla Fictícia", documento: "", email: "", telefone: "", observacoes: "" });
  if (!cliente.ok) throw new Error(cliente.erro);
  const novo = async (numero: string, assunto: string) => {
    const processo = await criarProcesso(contaId, { clienteId: cliente.valor.id, numero, tribunal: "TJSP", vara: "", assunto, parteContraria: "" });
    if (!processo.ok) throw new Error(processo.erro);
    return processo.valor.id;
  };
  const ativo = await novo("0001234-03.2026.8.26.0100", "Processo ativo");
  await mudarStatusDoProcesso(contaId, await novo("0009999-60.2026.8.26.0100", "Processo arquivado"), "arquivado");
  const aberto = await cadastrarPrazo(contaId, { origem: "manual", processoId: ativo, descricao: "Prazo aberto", dataFinal: "2027-03-01" });
  const feito = await cadastrarPrazo(contaId, { origem: "manual", processoId: ativo, descricao: "Prazo feito", dataFinal: "2027-03-02" });
  if (!aberto.ok || !feito.ok) throw new Error("prazo");
  await marcarComoCumprido(contaId, feito.valor.id);
});
afterAll(async () => {
  await apagarContaDeTeste(contaId);
});

function pedir(endereco: string, cabecalhos: Record<string, string> = {}, conta: string | null = contaId) {
  sessao.atual = conta ? { contaId: conta } : null;
  const url = new URL(`http://localhost:3000/exportar/${endereco}`);
  const lista = url.pathname.split("/")[2]!;
  return GET(new Request(url, { headers: cabecalhos }), { params: Promise.resolve({ lista }) });
}

async function primeiraColuna(endereco: string, coluna = 0) {
  const resposta = await pedir(endereco);
  expect(resposta.status).toBe(200);
  return valores(lerPlanilha(new Uint8Array(await resposta.arrayBuffer())).abas[0]!).map((linha) => linha[coluna]);
}

describe("rota das planilhas", () => {
  it("entrega o filtro e a busca do endereço à planilha", async () => {
    expect(await primeiraColuna("prazos?filtro=cumpridos")).toEqual(["Prazo feito"]);
    expect(await primeiraColuna("processos?status=arquivado", 2)).toEqual(["Processo arquivado"]);
    expect(await primeiraColuna("clientes?busca=bruno")).toEqual(["Bruno Fictício"]);
  });

  it("parâmetro repetido é ignorado, como a tela faz", async () => {
    expect(await primeiraColuna("clientes?busca=bruno&busca=alice")).toHaveLength(3);
  });

  it("sem sessão é 401 com instrução; lista desconhecida é 404", async () => {
    const semSessao = await pedir("clientes", {}, null);

    expect(semSessao.status).toBe(401);
    expect(await semSessao.text()).toBe("Entre na sua conta de novo para baixar a planilha.");
    expect((await pedir("usuarios")).status).toBe(404);
  });

  it("pedido vindo de outro site é recusado e não gasta o limite da conta", async () => {
    const vitima = await criarContaDeTeste("Conta visada");
    for (let vez = 0; vez < 15; vez += 1) {
      expect((await pedir("clientes", { "sec-fetch-site": "cross-site" }, vitima)).status).toBe(403);
    }

    expect((await pedir("clientes", { "sec-fetch-site": "same-origin" }, vitima)).status).toBe(200);
    expect((await pedir("clientes", { "sec-fetch-site": "none" }, vitima)).status).toBe(200);
    await apagarContaDeTeste(vitima);
  });

  it("HEAD não monta planilha", () => {
    expect(HEAD().status).toBe(405);
  });

  it("falha ao montar responde 500, sem detalhe, e o log não leva a busca", async () => {
    const saida: string[] = [];
    const escrever = vi.spyOn(process.stdout, "write").mockImplementation((texto) => (saida.push(String(texto)), true));
    const erro = vi.spyOn(process.stderr, "write").mockImplementation((texto) => (saida.push(String(texto)), true));
    // Um id de conta com o byte nulo faz o Postgres recusar a consulta.
    const resposta = await pedir("clientes?busca=NomeSigiloso", {}, "conta\u0000invalida");
    escrever.mockRestore();
    erro.mockRestore();

    expect(resposta.status).toBe(500);
    expect(await resposta.text()).toBe("Não foi possível montar a planilha agora. Tente de novo.");
    expect(saida.join("")).toContain("falha ao montar a planilha");
    expect(saida.join("")).not.toContain("NomeSigiloso");
  });
});
