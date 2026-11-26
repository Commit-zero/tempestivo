import type { Logger } from "@/platform/logger";
import type { Mailer } from "@/platform/mailer";

// Avisos de mudanças na segurança da conta: se não foi o titular, ele fica sabendo.
// O texto nunca leva senha, código, segredo nem link com token.

const AVISOS = {
  "senha-alterada": { assunto: "A senha do Tempestivo foi trocada", fato: "A senha da sua conta foi trocada." },
  "senha-redefinida": {
    assunto: "A senha do Tempestivo foi redefinida",
    fato: "A senha da sua conta foi redefinida pelo link enviado por e-mail.",
  },
  "segundo-fator-ligado": {
    assunto: "Verificação em duas etapas ligada no Tempestivo",
    fato: "A verificação em duas etapas foi ligada na sua conta.",
  },
  "segundo-fator-desligado": {
    assunto: "Verificação em duas etapas desligada no Tempestivo",
    fato: "A verificação em duas etapas foi desligada na sua conta.",
  },
  "codigos-gerados": {
    assunto: "Novos códigos de recuperação do Tempestivo",
    fato: "Novos códigos de recuperação foram gerados. Os anteriores deixaram de valer.",
  },
  "codigo-usado": {
    assunto: "Um código de recuperação do Tempestivo foi usado",
    fato: "Alguém entrou na sua conta usando um código de recuperação.",
  },
} as const;

export type AvisoDeSeguranca = keyof typeof AVISOS;

export type DependenciasDoAviso = { mailer: Mailer; logger: Logger; appUrl: string };

/** Nunca lança: a ação que gerou o aviso já aconteceu e não é desfeita por causa do e-mail. */
export async function enviarAvisoDeSeguranca(
  aviso: AvisoDeSeguranca,
  titular: { nome: string; email: string },
  { mailer, logger, appUrl }: DependenciasDoAviso,
): Promise<void> {
  const { assunto, fato } = AVISOS[aviso];
  try {
    await mailer.enviar({
      para: titular.email,
      assunto,
      texto:
        `Olá, ${titular.nome}.\n\n${fato}\n\n` +
        "Se foi você, não precisa fazer nada.\n\n" +
        `Se não foi você, crie uma senha nova agora:\n${appUrl.replace(/\/$/, "")}/recuperar-senha`,
    });
  } catch (erro) {
    logger.error("falha ao enviar o aviso de segurança", { aviso, tipo: erro instanceof Error ? erro.name : typeof erro });
  }
}
