import { getConfig } from "@/platform/config";
import { criarLogger, type Logger } from "@/platform/logger";
import { criarScheduler, type Scheduler } from "@/platform/scheduler";

// Raiz de composição: monta uma única vez as portas usadas pelas rotas e pelos
// serviços. Os testes não passam por aqui; eles injetam os fakes direto.
let logger: Logger | undefined;
let scheduler: Scheduler | undefined;

export function getLogger(): Logger {
  logger ??= criarLogger(getConfig());
  return logger;
}

export function getScheduler(): Scheduler {
  scheduler ??= criarScheduler(getConfig(), getLogger());
  return scheduler;
}
