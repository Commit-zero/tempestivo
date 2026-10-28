import type { Config } from "@/platform/config";
import type { Logger } from "@/platform/logger";
import { criarSchedulerHttp } from "./scheduler-http";
import type { Scheduler } from "./scheduler";

export type { Scheduler } from "./scheduler";
export { criarFakeScheduler, type FakeScheduler } from "./fake-scheduler";

export function criarScheduler(config: Pick<Config, "JOBS_SECRET">, logger: Logger): Scheduler {
  return criarSchedulerHttp({ jobsSecret: config.JOBS_SECRET, logger });
}
