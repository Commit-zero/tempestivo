// API pública do módulo `alertas`: o job de envio e o link "li e conferi" do e-mail.
export {
  confirmarPeloLink, enviarAlertasPendentes, obterPrazoDoLink,
  type DependenciasDosAlertas, type PrazoDoLink, type ResumoDosAlertas,
} from "./servico";
