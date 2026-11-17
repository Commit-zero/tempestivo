// API pública do módulo `audiencias`. Todo caso de uso recebe `contaId` primeiro.
export {
  atualizarAudiencia, criarAudiencia, excluirAudiencia, exportarAudienciaParaAgenda, listarAudienciasPassadas,
  listarProximasAudiencias, obterAudiencia, type EntradaDeAudiencia,
} from "./servico";
export { dataEHoraEmSaoPaulo, linkDeRota } from "./agenda";
export type { Audiencia } from "./repositorio";
