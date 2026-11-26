// API pública do módulo `exportacoes`: as planilhas das listas. Todo caso de uso recebe
// `contaId` primeiro. Os dados vêm dos outros módulos, pelas mesmas consultas das telas.
export { ehLista, LISTAS, montarPlanilha, permitirPlanilha, type FiltrosDaPlanilha, type Lista, type PlanilhaMontada } from "./servico";
