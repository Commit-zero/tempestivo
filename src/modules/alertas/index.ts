// API pública do módulo `alertas`: o job de envio e o link "li e conferi" do e-mail.
export {
  confirmarPeloLink, enviarAlertasPendentes, LIMITE_DIARIO_POR_CONTA, obterPrazoDoLink,
  type DependenciasDosAlertas, type PrazoDoLink, type ResumoDosAlertas,
} from "./servico";
