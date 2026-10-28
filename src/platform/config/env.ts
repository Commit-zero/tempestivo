import { z } from "zod";

const driver = () => z.enum(["fake"]).default("fake");

export const schemaEnv = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]),
  APP_URL: z.url(),
  JOBS_SECRET: z.string().min(32),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
  STORAGE_DRIVER: driver(),
  MAILER_DRIVER: driver(),
  NOTIFIER_DRIVER: driver(),
  AI_DRIVER: driver(),
});

export type Config = Readonly<z.infer<typeof schemaEnv>>;

export type VariaveisDeAmbiente = Record<string, string | undefined>;

export class ErroDeConfiguracao extends Error {
  constructor(readonly variaveis: readonly string[]) {
    super(`Configuração inválida. Corrija as variáveis: ${variaveis.join(", ")}.`);
    this.name = "ErroDeConfiguracao";
  }
}

// Variável vazia (`CHAVE=` no .env) conta como ausente. A mensagem de erro nunca
// carrega valores, só os nomes das variáveis, para não vazar segredo em log.
export function lerConfig(env: VariaveisDeAmbiente): Config {
  const preenchidas = Object.fromEntries(
    Object.keys(schemaEnv.shape).map((nome) => [nome, env[nome] === "" ? undefined : env[nome]]),
  );
  const resultado = schemaEnv.safeParse(preenchidas);
  if (!resultado.success) {
    const nomes = new Set(resultado.error.issues.map((problema) => String(problema.path[0])));
    throw new ErroDeConfiguracao([...nomes]);
  }
  return Object.freeze(resultado.data);
}
