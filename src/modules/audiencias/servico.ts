import { z } from "zod";
import { ehDataCivil } from "@/lib/datas";
import { falha, primeiraMensagem, sucesso, type Resultado } from "@/lib/resultado";
import { textoOpcional } from "@/lib/validacao";
import { obterProcesso } from "@/modules/processos";
import { gerarIcs, instanteEmSaoPaulo } from "./agenda";
import * as repositorio from "./repositorio";
import type { Audiencia } from "./repositorio";

const NAO_ENCONTRADA = "Audiência não encontrada.";

const schemaAudiencia = z.object({
  processoId: z.string().min(1, "Escolha o processo."),
  tipo: z.string().trim().min(2, "Informe o tipo da audiência (por exemplo, conciliação).").max(80, "Use no máximo 80 caracteres no tipo."),
  data: z.string().refine(ehDataCivil, "Informe a data da audiência."),
  hora: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Informe a hora no formato 14:30."),
  duracaoMin: z.coerce.number("Informe a duração em minutos.").int("A duração precisa ser um número inteiro de minutos.").min(5, "A duração mínima é de 5 minutos.").max(720, "A duração máxima é de 12 horas."),
  local: textoOpcional(200),
  linkVirtual: textoOpcional(500).refine(
    (valor) => valor === null || /^https:\/\/\S+$/.test(valor),
    "O link da audiência virtual precisa começar com https://.",
  ),
  observacoes: textoOpcional(2000),
});

export type EntradaDeAudiencia = Record<keyof z.input<typeof schemaAudiencia>, unknown>;

function validar(entrada: EntradaDeAudiencia) {
  const validado = schemaAudiencia.safeParse(entrada);
  if (!validado.success) return falha(primeiraMensagem(validado.error));
  const { data, hora, ...resto } = validado.data;
  return sucesso({ ...resto, inicio: instanteEmSaoPaulo(data, hora) });
}

export async function criarAudiencia(contaId: string, entrada: EntradaDeAudiencia): Promise<Resultado<Audiencia>> {
  const validado = validar(entrada);
  if (!validado.ok) return validado;
  // O processo precisa ser da mesma conta: o id vem do formulário.
  if (!(await obterProcesso(contaId, validado.valor.processoId))) return falha("Processo não encontrado.");
  return sucesso(await repositorio.criar(contaId, validado.valor));
}

export async function atualizarAudiencia(contaId: string, id: string, entrada: EntradaDeAudiencia): Promise<Resultado> {
  const atual = await repositorio.buscar(contaId, id);
  if (!atual) return falha(NAO_ENCONTRADA);
  const validado = validar({ ...entrada, processoId: atual.processoId });
  if (!validado.ok) return validado;
  // O processo de uma audiência não muda: vale sempre o que já estava gravado.
  await repositorio.atualizar(contaId, id, validado.valor);
  return sucesso();
}

/** Próximas audiências, da mais próxima para a mais distante. */
export function listarProximasAudiencias(contaId: string, agora = new Date(), processoId?: string): Promise<Audiencia[]> {
  return repositorio.listar(contaId, { aPartirDe: agora, processoId });
}

/** Audiências já realizadas, da mais recente para a mais antiga. */
export function listarAudienciasPassadas(contaId: string, agora = new Date()): Promise<Audiencia[]> {
  return repositorio.listar(contaId, { antesDe: agora });
}

export function obterAudiencia(contaId: string, id: string): Promise<Audiencia | null> {
  return repositorio.buscar(contaId, id);
}

export async function excluirAudiencia(contaId: string, id: string): Promise<Resultado> {
  return (await repositorio.excluir(contaId, id)) ? sucesso() : falha(NAO_ENCONTRADA);
}

/** Conteúdo do arquivo .ics da audiência, ou `null` se ela não é da conta. */
export async function exportarAudienciaParaAgenda(contaId: string, id: string, agora = new Date()): Promise<string | null> {
  const audiencia = await repositorio.buscar(contaId, id);
  if (!audiencia) return null;
  return gerarIcs(
    {
      id: audiencia.id,
      titulo: `Audiência de ${audiencia.tipo}: ${audiencia.processo.assunto}`,
      inicio: audiencia.inicio,
      duracaoMin: audiencia.duracaoMin,
      local: audiencia.local ?? audiencia.linkVirtual,
      descricao: [audiencia.linkVirtual ? `Link: ${audiencia.linkVirtual}` : null, audiencia.observacoes].filter(Boolean).join("\n") || null,
    },
    agora,
  );
}
