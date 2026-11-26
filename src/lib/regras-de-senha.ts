// Regras de senha, as mesmas na tela (marcação ao vivo) e no servidor (que decide).
// Não exigem maiúscula, número ou símbolo: isso leva a senhas previsíveis.
// Valem na próxima senha criada; quem já tem outra continua entrando.

export const TAMANHO_MINIMO_DA_SENHA = 10;
export const TAMANHO_MAXIMO_DA_SENHA = 128;

const MINIMO_DO_NOME_DO_EMAIL = 4;
const MAIOR_BLOCO_REPETIDO = 6;

// Lista curta, só com o que passaria na regra de tamanho, em minúsculas.
const SENHAS_COMUNS = new Set([
  "1234567890", "0123456789", "0987654321", "9876543210", "12345678910", "123456789a", "a123456789",
  "qwertyuiop", "qwerty1234", "qwerty12345", "qwerty123456", "1q2w3e4r5t", "1q2w3e4r5t6y", "1qaz2wsx3edc",
  "q1w2e3r4t5", "asdfghjklç", "asdfghjkl1",
  "password12", "password123", "password1234", "iloveyou123",
  "senha12345", "senha123456", "senha1234567", "minhasenha", "minhasenha1", "minhasenha123",
  "mudar12345", "mudar123456", "admin12345", "admin123456", "brasil12345", "brasil123456",
  "advogado123", "advocacia123", "tempestivo", "tempestivo123", "flamengo123", "corinthians",
]);

export type IdDaRegra = "tamanho" | "email" | "repeticao" | "comum";
export type RegraDeSenha = { id: IdDaRegra; descricao: string; erro: string; atendida: boolean };

function contemNomeDoEmail(senha: string, email: string): boolean {
  const nome = email.trim().toLowerCase().split("@")[0] ?? "";
  return nome.length >= MINIMO_DO_NOME_DO_EMAIL && senha.toLowerCase().includes(nome);
}

/** Verdadeiro quando a senha inteira é um bloco curto repetido, como "abcabcabca". */
function eRepeticao(senha: string): boolean {
  const maior = Math.min(MAIOR_BLOCO_REPETIDO, Math.floor(senha.length / 2));
  for (let bloco = 1; bloco <= maior; bloco += 1) {
    if (senha.slice(bloco) === senha.slice(0, -bloco)) return true;
  }
  return false;
}

export function avaliarSenha(senha: string, email = ""): RegraDeSenha[] {
  return [
    {
      id: "tamanho",
      descricao: `De ${TAMANHO_MINIMO_DA_SENHA} a ${TAMANHO_MAXIMO_DA_SENHA} caracteres`,
      erro: `A senha precisa ter de ${TAMANHO_MINIMO_DA_SENHA} a ${TAMANHO_MAXIMO_DA_SENHA} caracteres.`,
      atendida: senha.length >= TAMANHO_MINIMO_DA_SENHA && senha.length <= TAMANHO_MAXIMO_DA_SENHA,
    },
    {
      id: "email",
      descricao: "Sem o nome do seu e-mail",
      erro: "A senha não pode conter o nome do seu e-mail.",
      atendida: !contemNomeDoEmail(senha, email),
    },
    {
      id: "repeticao",
      descricao: "Sem repetir o mesmo caractere ou um trecho curto",
      erro: "A senha não pode ser um caractere ou um trecho curto repetido.",
      atendida: !eRepeticao(senha),
    },
    {
      id: "comum",
      descricao: "Fora da lista de senhas muito usadas",
      erro: "Essa senha é muito comum. Escolha outra.",
      atendida: !SENHAS_COMUNS.has(senha.toLowerCase()),
    },
  ];
}

/** A mensagem da primeira regra não atendida, ou `null` quando a senha serve. */
export function erroDaSenha(senha: string, email = ""): string | null {
  return avaliarSenha(senha, email).find((regra) => !regra.atendida)?.erro ?? null;
}
