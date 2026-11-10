// O canal de entrega. Quem decide quando e para quem notificar é o módulo `alertas`.
export type Notificacao = {
  contaId: string;
  usuarioId: string;
  titulo: string;
  corpo: string;
  url?: string;
};

export interface Notifier {
  notificar(notificacao: Notificacao): Promise<void>;
}
