import { toNextJsHandler } from "better-auth/next-js";
import { getAuth } from "@/platform/auth";

// Rotas do Better Auth (o link do e-mail de redefinição passa por aqui). O
// handler é montado na primeira requisição: o build não precisa de segredos.
type Handlers = ReturnType<typeof toNextJsHandler>;
let handlers: Handlers | undefined;
const obter = () => (handlers ??= toNextJsHandler(getAuth()));

export const GET = (requisicao: Request) => obter().GET(requisicao);
export const POST = (requisicao: Request) => obter().POST(requisicao);
