import { createHash, timingSafeEqual } from "node:crypto";
import type { Logger } from "@/platform/logger";
import type { Scheduler } from "./scheduler";

const formatoBearer = /^Bearer ([^\s]+)$/i;

// Compara os resumos SHA-256, que têm sempre 32 bytes: assim timingSafeEqual nunca
// recebe tamanhos diferentes e o tamanho do segredo não vaza pelo tempo da resposta.
function iguaisEmTempoConstante(a: string, b: string): boolean {
  const resumo = (texto: string) => createHash("sha256").update(texto).digest();
  return timingSafeEqual(resumo(a), resumo(b));
}

function ocultar(texto: string, segredo: string): string {
  return segredo === "" ? texto : texto.split(segredo).join("[oculto]");
}

export type OpcoesSchedulerHttp = {
  jobsSecret: string;
  logger: Logger;
  agora?: () => number;
};

export function criarSchedulerHttp({ jobsSecret, logger, agora = () => performance.now() }: OpcoesSchedulerHttp): Scheduler {
  return {
    autorizado(cabecalhos) {
      if (jobsSecret === "") return false;
      const enviado = formatoBearer.exec(cabecalhos.get("authorization") ?? "")?.[1];
      return enviado !== undefined && iguaisEmTempoConstante(enviado, jobsSecret);
    },

    async executar(nome, trabalho) {
      const log = logger.filho({ job: nome });
      const inicio = agora();
      log.info("job iniciado");
      try {
        const resultado = await trabalho();
        log.info("job concluído", { duracaoMs: Math.round(agora() - inicio) });
        return resultado;
      } catch (erro) {
        // Só o tipo e o código do erro: a mensagem de erros do banco pode trazer dados dos registros.
        const codigo = typeof erro === "object" && erro !== null && "code" in erro ? String(erro.code) : null;
        log.error("job falhou", {
          duracaoMs: Math.round(agora() - inicio),
          tipo: erro instanceof Error ? erro.name : typeof erro,
          codigo: codigo === null ? null : ocultar(codigo, jobsSecret),
        });
        throw erro;
      }
    },
  };
}
