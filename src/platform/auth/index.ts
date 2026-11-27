// Porta de autenticação: login próprio com Better Auth, senhas em Argon2id e
// sessão em cookie HttpOnly. As telas só conhecem o que este arquivo exporta.
export { getAuth } from "./auth";
export { apagarRegistrosVencidos } from "./limpeza";
export { cadastrar, confirmarSenhaAtual, entrar, reenviarConfirmacaoDeEmail, pedirRedefinicaoDeSenha, redefinirSenha, sair, trocarSenha, type ResultadoAuth, type ResultadoDaEntrada } from "./acoes";
export {
  confirmarCodigoDeEntrada, confirmarCodigoDeRecuperacao, haPassoPendente, MOTIVOS_DE_RECOMECO,
  type MotivoDeRecomeco, type ResultadoDoSegundoFator,
} from "./segundo-fator";
export {
  confirmarAtivacao, desativarSegundoFator, gerarNovosCodigos, iniciarAtivacao, segundoFatorLigado,
  type FimDaAtivacao, type InicioDaAtivacao,
} from "./ativacao";
export { exigirSessao, obterSessao, ROTA_DE_ENTRADA, type Sessao } from "./sessao";
