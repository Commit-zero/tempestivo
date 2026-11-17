import { z } from "zod";

const segredo = () => z.string().min(32);

export const schemaEnv = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]),
    APP_URL: z.url(),
    JOBS_SECRET: segredo(),
    AUTH_SECRET: segredo(),
    DATABASE_URL: z.string().regex(/^postgres(ql)?:\/\//),
    LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
    MAILER_DRIVER: z.enum(["fake", "smtp"]).default("fake"),
    SMTP_HOST: z.string().optional(),
    SMTP_PORT: z.coerce.number().int().min(1).max(65535).default(587),
    SMTP_USER: z.string().optional(),
    SMTP_PASS: z.string().optional(),
    EMAIL_REMETENTE: z.string().optional(),
    AI_DRIVER: z.enum(["local"]).default("local"),
  })
  // Variáveis de um driver só são exigidas quando o driver está ativo.
  .superRefine((env, contexto) => {
    // Em produção, http deixaria os cookies de sessão sem `Secure` e os links dos e-mails sem TLS.
    // APP_URL inválida já foi apontada pelo próprio campo; aqui só se confere o protocolo.
    const url = URL.canParse(env.APP_URL) ? new URL(env.APP_URL) : null;
    const local = url !== null && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
    if (url && env.NODE_ENV === "production" && url.protocol !== "https:" && !local) {
      contexto.addIssue({ code: "custom", path: ["APP_URL"], message: "precisa usar https em produção" });
    }
    const exigir = (nome: "SMTP_HOST" | "EMAIL_REMETENTE") => {
      if (!env[nome]) contexto.addIssue({ code: "custom", path: [nome], message: "obrigatória com o driver ativo" });
    };
    if (env.MAILER_DRIVER === "smtp") {
      exigir("SMTP_HOST");
      exigir("EMAIL_REMETENTE");
    }
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
