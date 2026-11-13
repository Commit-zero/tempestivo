// API pública do módulo `clientes`. Todo caso de uso recebe `contaId` primeiro.
export {
  atualizarCliente, criarCliente, excluirCliente, listarClientes, obterCliente, type EntradaDeCliente,
} from "./servico";
export type { Cliente, ClienteComContagem } from "./repositorio";
