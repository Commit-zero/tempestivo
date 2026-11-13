// API pública do módulo `tarefas`: o quadro de três colunas. Todo caso de uso recebe `contaId` primeiro.
export { COLUNAS, criarTarefa, excluirTarefa, moverTarefa, obterQuadro, type EntradaDeTarefa, type Quadro } from "./servico";
export type { Coluna, Tarefa } from "./repositorio";
