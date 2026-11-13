import type { Config } from "@/platform/config";
import type { Extrator } from "./extrator";
import { criarExtratorLocal } from "./extrator-local";

export type { Extrator } from "./extrator";
export { criarFakeExtrator, type FakeExtrator } from "./fake-extrator";

// Hoje só existe o extrator local, por regras. Um modelo de linguagem entra aqui
// como outro driver, sem mudar quem chama: a saída continua `unknown` e validada.
export function criarExtrator(config: Pick<Config, "AI_DRIVER">): Extrator {
  switch (config.AI_DRIVER) {
    case "local":
      return criarExtratorLocal();
  }
}
