import type { Contexto, Logger, NivelLog } from "./logger";

export type Registro = { nivel: NivelLog; msg: string; contexto: Contexto };

export type FakeLogger = Logger & { readonly registros: Registro[] };

export function criarFakeLogger(contextoBase: Contexto = {}, registros: Registro[] = []): FakeLogger {
  const registrar = (nivel: NivelLog, msg: string, ctx: Contexto = {}) => {
    registros.push({ nivel, msg, contexto: { ...contextoBase, ...ctx } });
  };
  return {
    registros,
    debug: (msg, ctx) => registrar("debug", msg, ctx),
    info: (msg, ctx) => registrar("info", msg, ctx),
    warn: (msg, ctx) => registrar("warn", msg, ctx),
    error: (msg, ctx) => registrar("error", msg, ctx),
    filho: (ctx) => criarFakeLogger({ ...contextoBase, ...ctx }, registros),
  };
}
