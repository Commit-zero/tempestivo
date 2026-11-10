import type { Notificacao, Notifier } from "./notifier";

export type FakeNotifier = Notifier & { readonly notificadas: Notificacao[] };

export function criarFakeNotifier(): FakeNotifier {
  const notificadas: Notificacao[] = [];
  return {
    notificadas,
    async notificar(notificacao) {
      if (!notificacao.contaId.trim()) throw new Error("Notificação sem conta.");
      if (!notificacao.usuarioId.trim()) throw new Error("Notificação sem usuário.");
      notificadas.push(notificacao);
    },
  };
}
