import type { Config } from "@/platform/config";
import { criarJsonLogger, type OpcoesJsonLogger } from "./json-logger";
import type { Logger } from "./logger";

export type { Contexto, Logger, NivelLog } from "./logger";
export { criarFakeLogger, type FakeLogger, type Registro } from "./fake-logger";

export function criarLogger(
  config: Pick<Config, "LOG_LEVEL">,
  opcoes: Omit<OpcoesJsonLogger, "nivel"> = {},
): Logger {
  return criarJsonLogger({ ...opcoes, nivel: config.LOG_LEVEL });
}
