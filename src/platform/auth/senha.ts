import { hash, verify, type Options } from "@node-rs/argon2";

// Argon2id com os parâmetros do exemplo oficial do Better Auth (64 MiB, 3 passadas).
const opcoes: Options = {
  memoryCost: 65_536,
  timeCost: 3,
  parallelism: 4,
  outputLen: 32,
  algorithm: 2, // Argon2id
};

export function gerarHashDaSenha(senha: string): Promise<string> {
  return hash(senha, opcoes);
}

export async function conferirSenha({ hash: guardado, password }: { hash: string; password: string }): Promise<boolean> {
  try {
    return await verify(guardado, password, opcoes);
  } catch {
    // Hash em formato desconhecido conta como senha errada, nunca como erro do servidor.
    return false;
  }
}
