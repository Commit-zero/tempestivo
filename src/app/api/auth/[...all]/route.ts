import { toNextJsHandler } from "better-auth/next-js";
import { getAuth } from "@/platform/auth";

// O app fala com o Better Auth pelo servidor (server actions), onde ficam o limitador
// de tentativas, o aceite dos termos e as mensagens que não revelam se um e-mail
// existe. Por HTTP só passam os links dos e-mails (redefinição de senha e confirmação
// de e-mail); o resto responde 404, para ninguém contornar essas proteções chamando a
// API direto.
const ROTAS_PERMITIDAS = [/^\/api\/auth\/reset-password\/[A-Za-z0-9_-]+$/, /^\/api\/auth\/verify-email$/];

type Handlers = ReturnType<typeof toNextJsHandler>;
let handlers: Handlers | undefined;
const obter = () => (handlers ??= toNextJsHandler(getAuth()));

export function GET(requisicao: Request) {
  const caminho = new URL(requisicao.url).pathname;
  if (!ROTAS_PERMITIDAS.some((rota) => rota.test(caminho))) return new Response(null, { status: 404 });
  return obter().GET(requisicao);
}

export function POST() {
  return new Response(null, { status: 404 });
}
