// API pública do módulo `prazos`. Todo caso de uso recebe `contaId` primeiro.
// A calculadora é auxiliar: toda tela que mostra uma data calculada mostra também
// os passos e o aviso "Cálculo auxiliar, confira."
export {
  ajustarTipoDoCatalogo, cadastrarDiaSemExpediente, cadastrarPrazo, confirmarConferencia, criarTipoDePrazo,
  desfazerCumprido, editarPrazo, excluirDiaSemExpediente, excluirPrazo, FILTROS_DE_PRAZOS, listarDiasSemExpediente,
  listarPrazos, listarTiposDePrazo, marcarComoCumprido, obterPrazo, previsualizarPrazo, removerTipoDaConta,
  type DetalheDoPrazo, type EntradaDeCalculo, type EntradaDePrazo, type FiltroDaLista, type PrazoComSituacao,
  type TipoDePrazo,
} from "./servico";
export {
  AVISO_CALCULO_AUXILIAR, type Contagem, type ResultadoCalculo, type TipoEvento,
} from "./dominio/calcular-prazo";
export { TRIBUNAIS, buscarTribunal, type Tribunal } from "./dominio/calendario";
export { listarRegras, type Regra } from "./dominio/regras";
export type { Situacao, StatusPrazo } from "./dominio/situacao";
export type { Alteracao, CanalConferencia, Conferencia, DiaCadastrado, MemoriaDoCalculo, Prazo } from "./repositorio";
