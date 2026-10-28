export type NivelLog = "debug" | "info" | "warn" | "error";

export type Contexto = Record<string, string | number | boolean | null>;

export interface Logger {
  debug(msg: string, ctx?: Contexto): void;
  info(msg: string, ctx?: Contexto): void;
  warn(msg: string, ctx?: Contexto): void;
  error(msg: string, ctx?: Contexto): void;
  filho(ctx: Contexto): Logger;
}

export const ordemDosNiveis: Record<NivelLog, number> = { debug: 0, info: 1, warn: 2, error: 3 };
