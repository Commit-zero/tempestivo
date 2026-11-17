// API pública do módulo `conta`: dados da conta, do advogado substituto, exportação e exclusão (LGPD).
export {
  aceitarConviteDeSubstituto, ativarAgenda, atualizarConta, contaDaAgenda, definirMargemDeSeguranca, desativarAgenda,
  excluirConta, exportarDadosDaConta, MARGEM_MAXIMA, obterConta, obterConviteDeSubstituto,
  type ConviteDeSubstituto, type DependenciasDoConvite, type ExportacaoDaConta,
} from "./servico";
export type { Conta } from "./repositorio";
