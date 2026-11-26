// Porta de autenticação: login próprio com Better Auth, senhas em Argon2id e
// sessão em cookie HttpOnly. As telas só conhecem o que este arquivo exporta.
export { getAuth } from "./auth";
export { cadastrar, confirmarSenhaAtual, entrar, reenviarConfirmacaoDeEmail, pedirRedefinicaoDeSenha, redefinirSenha, sair, type ResultadoAuth } from "./acoes";
export { exigirSessao, obterSessao, ROTA_DE_ENTRADA, type Sessao } from "./sessao";
