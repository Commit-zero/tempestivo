import type { Scheduler } from "./scheduler";

export type FakeScheduler = Scheduler & { readonly executados: string[] };

export function criarFakeScheduler({ autorizar = false }: { autorizar?: boolean } = {}): FakeScheduler {
  const executados: string[] = [];
  return {
    executados,
    autorizado: () => autorizar,
    async executar(nome, trabalho) {
      executados.push(nome);
      return trabalho();
    },
  };
}
