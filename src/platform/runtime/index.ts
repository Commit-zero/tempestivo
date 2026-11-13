import { criarExtrator, type Extrator } from "@/platform/ai";
import { getConfig } from "@/platform/config";
import { criarLogger, type Logger } from "@/platform/logger";
import { criarMailer, type Mailer } from "@/platform/mailer";
import { criarScheduler, type Scheduler } from "@/platform/scheduler";

// Raiz de composição: monta uma única vez as portas usadas pelas rotas e pelos
// serviços. Os testes não passam por aqui; eles injetam os fakes direto.
let logger: Logger | undefined;
let scheduler: Scheduler | undefined;
let mailer: Mailer | undefined;
let extrator: Extrator | undefined;

export function getLogger(): Logger {
  logger ??= criarLogger(getConfig());
  return logger;
}

export function getScheduler(): Scheduler {
  scheduler ??= criarScheduler(getConfig(), getLogger());
  return scheduler;
}

export function getMailer(): Mailer {
  mailer ??= criarMailer(getConfig());
  return mailer;
}

export function getExtrator(): Extrator {
  extrator ??= criarExtrator(getConfig());
  return extrator;
}
