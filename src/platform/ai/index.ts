import type { Config } from "@/platform/config";
import { criarFakeExtrator, type FakeExtrator } from "./fake-extrator";

export type { Extrator } from "./extrator";
export { criarFakeExtrator, type FakeExtrator } from "./fake-extrator";

// Só o driver "fake" existe por enquanto; o adaptador Gemini entra na base-B.
export function criarExtrator(config: Pick<Config, "AI_DRIVER">): FakeExtrator {
  switch (config.AI_DRIVER) {
    case "fake":
      return criarFakeExtrator();
  }
}
