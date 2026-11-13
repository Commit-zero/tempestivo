import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { criarCliente } from "@/modules/clientes";
import { listarPrazos } from "@/modules/prazos";
import { criarProcesso, mudarStatusDoProcesso } from "@/modules/processos";
import { criarFakeExtrator, type Extrator } from "@/platform/ai";
import { criarExtratorLocal } from "@/platform/ai/extrator-local";
import { apagarContaDeTeste, criarContaDeTeste } from "@/test/banco";
import { lerIntimacao } from "./index";

const TEXTO =
  "Processo 0001234-03.2026.8.26.0100. Disponibilizado no DJe em 12/11/2026. " +
  "Fica a parte ré intimada para apresentar contestação no prazo de 15 (quinze) dias úteis.";

describe("leitor de intimação (integração)", () => {
  let contaA: string;
  let contaB: string;
  let processoA: string;

  beforeAll(async () => {
    [contaA, contaB] = await Promise.all([criarContaDeTeste("Conta A"), criarContaDeTeste("Conta B")]);
    const cliente = await criarCliente(contaA, { nome: "Cliente Fictício", documento: "", email: "", telefone: "", observacoes: "" });
    if (!cliente.ok) throw new Error(cliente.erro);
    const processo = await criarProcesso(contaA, {
      clienteId: cliente.valor.id, numero: "0001234-03.2026.8.26.0100", tribunal: "TJSP", vara: "", assunto: "Ação fictícia", parteContraria: "",
    });
    if (!processo.ok) throw new Error(processo.erro);
    processoA = processo.valor.id;
  });
  afterAll(async () => {
    await Promise.all([apagarContaDeTeste(contaA), apagarContaDeTeste(contaB)]);
  });

  it("devolve um rascunho com o processo da conta, sem criar prazo nenhum", async () => {
    const lido = await lerIntimacao(contaA, TEXTO, criarExtratorLocal());

    expect(lido.ok && lido.valor).toMatchObject({
      processo: { id: processoA, assunto: "Ação fictícia" }, dataEvento: "2026-11-12", tipoEvento: "disponibilizacao",
      dias: 15, contagem: "uteis", descricao: "Contestação", confianca: "alta", avisos: [],
    });
    expect(await listarPrazos(contaA)).toEqual([]);
  });

  it("não encontra o processo de outra conta, mesmo com o número certo", async () => {
    const lido = await lerIntimacao(contaB, TEXTO, criarExtratorLocal());

    expect(lido.ok && lido.valor.processo).toBeNull();
    expect(lido.ok && lido.valor.avisos).toContain("O processo deste número não está cadastrado na sua conta. Cadastre-o ou escolha outro.");
  });

  it("avisa o que faltou em vez de inventar", async () => {
    const lido = await lerIntimacao(contaA, "Vistos. Aguarde-se o retorno dos autos da instância superior.", criarExtratorLocal());

    expect(lido.ok && lido.valor).toMatchObject({ dias: null, dataEvento: null, processo: null, confianca: "baixa" });
    expect(lido.ok && lido.valor.avisos).toHaveLength(3);
  });

  it("descarta campo a campo o que o extrator devolver fora do formato", async () => {
    const malicioso = criarFakeExtrator({
      numeroProcesso: "'; DROP TABLE prazo; --", dataEvento: "2026-02-31", tipoEvento: "boato", dias: 9999, contagem: "semanas",
      descricao: "Contestação", confianca: "altíssima", evidencias: "não é um objeto",
    });

    const lido = await lerIntimacao(contaA, TEXTO, malicioso);

    expect(lido.ok && lido.valor).toMatchObject({
      numeroProcesso: null, dataEvento: null, tipoEvento: null, dias: null, contagem: null, descricao: "Contestação", confianca: "baixa", evidencias: {},
    });
  });

  it("processo arquivado não é sugerido", async () => {
    await mudarStatusDoProcesso(contaA, processoA, "arquivado");
    const lido = await lerIntimacao(contaA, TEXTO, criarExtratorLocal());
    await mudarStatusDoProcesso(contaA, processoA, "ativo");

    expect(lido.ok && lido.valor.processo).toBeNull();
    expect(lido.ok && lido.valor.avisos[0]).toContain("arquivado");
  });

  it("recusa texto vazio, curto ou longo demais, e segue quando o extrator falha", async () => {
    const quebrado: Extrator = { extrair: async () => { throw new Error("cota esgotada"); } };

    expect(await lerIntimacao(contaA, "curto", criarExtratorLocal())).toEqual({ ok: false, erro: "Cole o texto da intimação." });
    expect(await lerIntimacao(contaA, 123, criarExtratorLocal())).toMatchObject({ ok: false });
    expect((await lerIntimacao(contaA, "x".repeat(20_001), criarExtratorLocal())).ok).toBe(false);
    expect(await lerIntimacao(contaA, TEXTO, quebrado)).toEqual({ ok: false, erro: "Não foi possível ler a intimação agora. Preencha o prazo manualmente." });
  });
});
