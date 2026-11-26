import { celula, type Aba } from "@/lib/planilha";
import { resumoFinanceiro } from "@/modules/honorarios";
import { abasDeAudiencias } from "./audiencias";
import { abasDeClientes } from "./clientes";
import { abasDeHonorarios } from "./honorarios";
import { abasDePrazos } from "./prazos";
import { abasDeProcessos } from "./processos";
import { abasDeTarefas } from "./tarefas";

// Todas as listas, sem filtro, num arquivo só, com um resumo na frente. É montada com as
// mesmas funções das planilhas por lista, para as duas nunca dizerem coisas diferentes.

function resumo(abas: Record<string, Aba>, quantidadeDePrazos: [number, number], totais: Awaited<ReturnType<typeof resumoFinanceiro>>): Aba {
  const quantos = (item: string, quantidade: number) => [celula.texto(item), celula.inteiro(quantidade), null];
  const quanto = (item: string, centavos: number) => [celula.texto(item), null, celula.dinheiro(centavos)];
  const linhasDe = (nome: string) => abas[nome]!.linhas.length;
  return {
    nome: "Resumo",
    colunas: [{ titulo: "Item", largura: 34 }, { titulo: "Quantidade", largura: 13 }, { titulo: "Valor", largura: 18 }],
    linhas: [
      quantos("Clientes", linhasDe("Clientes")),
      quantos("Processos", linhasDe("Processos")),
      quantos("Prazos em aberto", quantidadeDePrazos[0]),
      quantos("Prazos cumpridos", quantidadeDePrazos[1]),
      quantos("Honorários", linhasDe("Honorários")),
      quantos("Audiências próximas", linhasDe("Audiências próximas")),
      quantos("Audiências realizadas", linhasDe("Audiências realizadas")),
      quantos("Tarefas", linhasDe("Tarefas")),
      quanto("Honorários a receber", totais.aReceberCentavos),
      quanto("Honorários em atraso", totais.emAtrasoCentavos),
      quanto("Honorários recebidos neste mês", totais.recebidoNoMesCentavos),
    ],
  };
}

export async function abasCompletas(contaId: string, _filtros: unknown, agora: Date): Promise<Aba[]> {
  const [clientes, processos, abertos, cumpridos, honorarios, audiencias, tarefas, totais] = await Promise.all([
    abasDeClientes(contaId, {}),
    abasDeProcessos(contaId, { status: "todos" }),
    abasDePrazos(contaId, { filtro: "em_aberto" }, agora),
    abasDePrazos(contaId, { filtro: "cumpridos" }, agora),
    abasDeHonorarios(contaId, {}, agora),
    abasDeAudiencias(contaId, {}, agora),
    abasDeTarefas(contaId),
    resumoFinanceiro(contaId, agora),
  ]);
  const [prazosAbertos, leiaMe] = abertos as [Aba, Aba];
  const prazos = { ...prazosAbertos, linhas: [...prazosAbertos.linhas, ...cumpridos[0]!.linhas] };
  const [proximas, realizadas] = audiencias as [Aba, Aba];
  const abas = [
    ...clientes, ...processos, prazos, leiaMe, ...honorarios,
    { ...proximas, nome: "Audiências próximas" }, { ...realizadas, nome: "Audiências realizadas" }, ...tarefas,
  ];
  const porNome = Object.fromEntries(abas.map((aba) => [aba.nome, aba]));
  return [resumo(porNome, [prazosAbertos.linhas.length, cumpridos[0]!.linhas.length], totais), ...abas];
}
