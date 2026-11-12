"use server";

import { redirect } from "next/navigation";
import { ROTA_DE_ENTRADA, sair } from "@/platform/auth";

export async function acaoSair(): Promise<void> {
  await sair();
  redirect(ROTA_DE_ENTRADA);
}
