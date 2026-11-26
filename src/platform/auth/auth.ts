import "server-only";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { TAMANHO_MAXIMO_DA_SENHA, TAMANHO_MINIMO_DA_SENHA } from "@/lib/regras-de-senha";
import { getConfig } from "@/platform/config";
import { getPrisma } from "@/platform/database";
import { getLogger, getMailer } from "@/platform/runtime";
import { conferirSenha, gerarHashDaSenha } from "./senha";

const UMA_HORA = 60 * 60;
const UM_DIA = 24 * UMA_HORA;

function criarAuth() {
  const config = getConfig();
  return betterAuth({
    appName: "Tempestivo",
    baseURL: config.APP_URL,
    secret: config.AUTH_SECRET,
    database: prismaAdapter(getPrisma(), { provider: "postgresql" }),
    emailAndPassword: {
      enabled: true,
      autoSignIn: true,
      minPasswordLength: TAMANHO_MINIMO_DA_SENHA,
      maxPasswordLength: TAMANHO_MAXIMO_DA_SENHA,
      password: { hash: gerarHashDaSenha, verify: conferirSenha },
      resetPasswordTokenExpiresIn: UMA_HORA,
      revokeSessionsOnPasswordReset: true,
      // Sem `await`, como recomenda a documentação: o tempo de resposta não revela
      // se o e-mail existe. A falha de envio vai para o log, sem o endereço.
      sendResetPassword: async ({ user, url }) => {
        void getMailer()
          .enviar({
            para: user.email,
            assunto: "Redefinir a senha do Tempestivo",
            texto:
              `Olá, ${user.name}.\n\nPara criar uma nova senha, abra o link abaixo. Ele vale por 1 hora e só pode ser usado uma vez.\n\n${url}\n\n` +
              "Se você não pediu a redefinição, ignore este e-mail: a sua senha continua a mesma.",
          })
          .catch((erro: unknown) => {
            getLogger().error("falha ao enviar a redefinição de senha", {
              tipo: erro instanceof Error ? erro.name : typeof erro,
            });
          });
      },
    },
    // O login não exige o e-mail confirmado, mas os alertas de prazo só vão para quem
    // confirmou: assim ninguém usa o Tempestivo para mandar e-mails ao endereço de outra pessoa.
    emailVerification: {
      sendOnSignUp: true,
      autoSignInAfterVerification: true,
      expiresIn: UM_DIA,
      sendVerificationEmail: async ({ user, url }) => {
        void getMailer()
          .enviar({
            para: user.email,
            assunto: "Confirme o seu e-mail no Tempestivo",
            texto:
              `Olá, ${user.name}.\n\nPara receber os alertas de prazo neste endereço, confirme o e-mail abrindo o link abaixo. ` +
              `Ele vale por 24 horas.\n\n${url}\n\nSe você não criou uma conta no Tempestivo, ignore este e-mail.`,
          })
          .catch((erro: unknown) => {
            getLogger().error("falha ao enviar a confirmação de e-mail", { tipo: erro instanceof Error ? erro.name : typeof erro });
          });
      },
    },
    session: { expiresIn: 7 * UM_DIA, updateAge: UM_DIA },
    // Vale para as chamadas HTTP em /api/auth/*. As telas usam server actions, que
    // têm o limitador próprio (`src/lib/limitador.ts`).
    rateLimit: { enabled: true, window: 60, max: 60 },
    advanced: { cookiePrefix: "tempestivo" },
    // Precisa ser o último plugin: grava os cookies de sessão nas server actions.
    plugins: [nextCookies()],
  });
}

type Auth = ReturnType<typeof criarAuth>;
let auth: Auth | undefined;

export function getAuth(): Auth {
  auth ??= criarAuth();
  return auth;
}
