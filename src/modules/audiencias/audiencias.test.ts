import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { criarCliente } from "@/modules/clientes";
import { criarProcesso } from "@/modules/processos";
import { apagarContaDeTeste, criarContaDeTeste } from "@/test/banco";
import { gerarIcs, instanteEmSaoPaulo } from "./agenda";
import {
  atualizarAudiencia, criarAudiencia, dataEHoraEmSaoPaulo, excluirAudiencia, exportarAudienciaParaAgenda, linkDeRota,
  listarAudienciasPassadas, listarProximasAudiencias, obterAudiencia,
} from "./index";

const agora = new Date("2026-11-12T15:00:00Z");

describe("agenda", () => {
  it("converte data e hora de São Paulo para o instante certo, ida e volta", () => {
    const instante = instanteEmSaoPaulo("2026-11-20", "14:30");

    expect(instante.toISOString()).toBe("2026-11-20T17:30:00.000Z");
    expect(dataEHoraEmSaoPaulo(instante)).toEqual({ data: "2026-11-20", hora: "14:30" });
    // 22:00 em São Paulo já é o dia seguinte em UTC.
    expect(dataEHoraEmSaoPaulo(instanteEmSaoPaulo("2026-11-20", "22:00"))).toEqual({ data: "2026-11-20", hora: "22:00" });
  });

  it("gera um .ics válido, em UTC, com texto escapado", () => {
    const ics = gerarIcs(
      { id: "abc", titulo: "Audiência; conciliação, 1ª", inicio: instanteEmSaoPaulo("2026-11-20", "14:30"), duracaoMin: 90, local: "Fórum João Mendes, sala 3", descricao: "linha 1\nlinha 2" },
      agora,
    );

    expect(ics.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
    expect(ics).toContain("UID:abc@tempestivo");
    expect(ics).toContain("DTSTART:20261120T173000Z");
    expect(ics).toContain("DTEND:20261120T190000Z");
    expect(ics).toContain("SUMMARY:Audiência\\; conciliação\\, 1ª");
    expect(ics).toContain("LOCATION:Fórum João Mendes\\, sala 3");
    expect(ics).toContain("DESCRIPTION:linha 1\\nlinha 2");
    // Um \r sozinho não pode criar uma propriedade nova no arquivo.
    const injetado = gerarIcs({ id: "x", titulo: "T", inicio: new Date(0), duracaoMin: 5, local: null, descricao: "a\rATTENDEE:mailto:x@y" }, agora);
    expect(injetado).not.toMatch(/\r?\nATTENDEE/);
  });

  it("monta o link de rota com o endereço codificado", () => {
    expect(linkDeRota("Praça João Mendes, s/n")).toBe("https://www.google.com/maps/dir/?api=1&destination=Pra%C3%A7a%20Jo%C3%A3o%20Mendes%2C%20s%2Fn");
  });
});

describe("audiências (integração)", () => {
  let contaA: string;
  let contaB: string;
  let processoA: string;

  const entrada = (processoId: string, extra: Record<string, unknown> = {}) => ({
    processoId, tipo: "Conciliação", data: "2026-11-20", hora: "14:30", duracaoMin: "60", local: "Fórum fictício", linkVirtual: "", observacoes: "", ...extra,
  });

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

  it("cria, separa próximas de passadas e ordena", async () => {
    const futura = await criarAudiencia(contaA, entrada(processoA));
    const maisCedo = await criarAudiencia(contaA, entrada(processoA, { data: "2026-11-13", tipo: "Instrução" }));
    const passada = await criarAudiencia(contaA, entrada(processoA, { data: "2026-11-01", tipo: "Una" }));
    if (!futura.ok || !maisCedo.ok || !passada.ok) throw new Error("falha ao criar");

    expect(futura.valor.inicio.toISOString()).toBe("2026-11-20T17:30:00.000Z");
    expect((await listarProximasAudiencias(contaA, agora)).map((audiencia) => audiencia.tipo)).toEqual(["Instrução", "Conciliação"]);
    expect((await listarAudienciasPassadas(contaA, agora)).map((audiencia) => audiencia.tipo)).toEqual(["Una"]);
  });

  it("valida hora, duração e link, e recusa processo de outra conta", async () => {
    const erroDe = async (contaId: string, extra: Record<string, unknown>) => {
      const resultado = await criarAudiencia(contaId, entrada(processoA, extra));
      return resultado.ok ? null : resultado.erro;
    };
    expect(await erroDe(contaA, { hora: "25:00" })).toBe("Informe a hora no formato 14:30.");
    expect(await erroDe(contaA, { duracaoMin: "1" })).toBe("A duração mínima é de 5 minutos.");
    expect(await erroDe(contaA, { linkVirtual: "javascript:alert(1)" })).toBe("O link da audiência virtual precisa começar com https://.");
    expect(await erroDe(contaB, {})).toBe("Processo não encontrado.");
  });

  it("atualiza, exporta para a agenda e exclui; a conta B não alcança nada disso", async () => {
    const criada = await criarAudiencia(contaA, entrada(processoA, { tipo: "Julgamento", data: "2026-12-01" }));
    if (!criada.ok) throw new Error(criada.erro);
    const id = criada.valor.id;

    expect(await obterAudiencia(contaB, id)).toBeNull();
    expect(await exportarAudienciaParaAgenda(contaB, id, agora)).toBeNull();
    expect((await atualizarAudiencia(contaB, id, entrada(processoA))).ok).toBe(false);
    expect((await excluirAudiencia(contaB, id)).ok).toBe(false);
    expect(await listarProximasAudiencias(contaB, agora)).toEqual([]);

    expect((await atualizarAudiencia(contaA, id, entrada(processoA, { tipo: "Julgamento", data: "2026-12-02", hora: "09:00" }))).ok).toBe(true);
    expect((await obterAudiencia(contaA, id))?.inicio.toISOString()).toBe("2026-12-02T12:00:00.000Z");
    expect(await exportarAudienciaParaAgenda(contaA, id, agora)).toContain("SUMMARY:Audiência de Julgamento: Ação fictícia");
    expect((await excluirAudiencia(contaA, id)).ok).toBe(true);
  });
});
