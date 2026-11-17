import { bancoResponde } from "@/platform/health";
import pacote from "../../../../package.json";

export const dynamic = "force-dynamic";

// Resposta mínima de propósito: nada de mensagem interna, host ou string de conexão.
export async function GET() {
  const bancoOk = await bancoResponde();
  return Response.json(
    bancoOk
      ? { status: "ok", banco: "ok", versao: pacote.version }
      : { status: "erro", banco: "erro" },
    { status: bancoOk ? 200 : 503, headers: { "Cache-Control": "no-store" } },
  );
}
