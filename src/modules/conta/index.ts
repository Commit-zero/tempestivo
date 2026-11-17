// API pública do módulo `conta`: dados da conta, do advogado substituto, exportação e exclusão (LGPD).
export {
  aceitarConviteDeSubstituto, atualizarConta, excluirConta, exportarDadosDaConta, obterConta, obterConviteDeSubstituto,
  type ConviteDeSubstituto, type DependenciasDoConvite, type ExportacaoDaConta,
} from "./servico";
export type { Conta } from "./repositorio";
