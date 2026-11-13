import { buscarTribunal, listarTiposDePrazo } from "@/modules/prazos";
import { formatarNumeroCnj, listarProcessos } from "@/modules/processos";
import type { OpcaoDeProcesso, OpcaoDeTipo } from "./formulario";

/** Opções dos seletores do formulário de prazo: processos ativos e tipos do catálogo da conta. */
export async function carregarOpcoesDoFormulario(contaId: string): Promise<{ processos: OpcaoDeProcesso[]; tipos: OpcaoDeTipo[] }> {
  const [processos, tipos] = await Promise.all([listarProcessos(contaId, { status: "ativo" }), listarTiposDePrazo(contaId)]);
  return {
    processos: processos.map((processo) => ({
      id: processo.id,
      rotulo: `${processo.cliente.nome} · ${processo.assunto} (${formatarNumeroCnj(processo.numero)})`,
      tribunal: processo.tribunal,
      atendido: buscarTribunal(processo.tribunal) !== undefined,
    })),
    tipos: tipos.map(({ id, nome, dias, contagem }) => ({ id, nome, dias, contagem })),
  };
}
