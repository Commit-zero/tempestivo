import { z } from "zod";

const segredo = () => z.string().min(32);

// Banco remoto é o que tem domínio (com ponto) e não é a própria máquina. Nome sem
// ponto é serviço da rede interna, como o `banco` do Docker no CI.
function bancoRemoto(url: string): boolean {
  if (!URL.canParse(url)) return false;
  const host = new URL(url).hostname;
  return host.includes(".") && !/^127\./.test(host) && host !== "[::1]";
}

export const schemaEnv = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]),
    APP_URL: z.url(),
    JOBS_SECRET: segredo(),
    AUTH_SECRET: segredo(),
    DATABASE_URL: z.string().regex(/^postgres(ql)?:\/\//),
    // Conexões por instância. Em função serverless (Vercel), poucas: o pooler do banco multiplexa.
    DATABASE_POOL_MAX: z.coerce.number().int().min(1).max(50).default(5),
    // Certificado (PEM) da autoridade do banco, para verificar o TLS. Ex.: o certificado do Supabase.
    DATABASE_CA_CERT: z.string().optional(),
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
    // Em produção, banco fora da máquina e da rede interna precisa de TLS verificado:
    // sem certificado, o driver `pg` conecta em texto puro, e a senha do banco e os dados
    // dos clientes passariam abertos. `sslmode=verify-full` serve para banco com
    // certificado de autoridade pública.
    if (env.NODE_ENV === "production" && !env.DATABASE_CA_CERT && bancoRemoto(env.DATABASE_URL)) {
      const modo = URL.canParse(env.DATABASE_URL) ? new URL(env.DATABASE_URL).searchParams.get("sslmode") : null;
      if (modo !== "verify-full") {
        contexto.addIssue({ code: "custom", path: ["DATABASE_CA_CERT"], message: "obrigatória em produção com banco remoto" });
      }
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
