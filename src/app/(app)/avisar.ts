import { cookies } from "next/headers";
import { codificarAviso, COOKIE_DO_AVISO, type ChaveDeAviso } from "@/lib/avisos";
import { getConfig } from "@/platform/config";

/**
 * Deixa o aviso para a tela que a ação vai mostrar, na mesma ou em outra rota. O
 * navegador apaga o cookie assim que mostra; sem JavaScript, ele vence sozinho. Não é
 * `HttpOnly` justamente para a tela poder apagá-lo: ele só carrega uma chave pública.
 */
export async function avisar(chave: ChaveDeAviso): Promise<void> {
  (await cookies()).set(COOKIE_DO_AVISO, codificarAviso(chave, Date.now()), {
    path: "/",
    maxAge: 20,
    sameSite: "lax",
    secure: getConfig().APP_URL.startsWith("https://"),
  });
}
