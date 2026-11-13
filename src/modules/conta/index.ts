// API pública do módulo `conta`: dados da conta, do advogado substituto, exportação e exclusão (LGPD).
export { atualizarConta, excluirConta, exportarDadosDaConta, obterConta, type ExportacaoDaConta } from "./servico";
export type { Conta } from "./repositorio";
