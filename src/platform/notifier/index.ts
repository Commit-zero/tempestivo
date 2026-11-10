import type { Config } from "@/platform/config";
import { criarFakeNotifier, type FakeNotifier } from "./fake-notifier";

export type { Notificacao, Notifier } from "./notifier";
export { criarFakeNotifier, type FakeNotifier } from "./fake-notifier";

// Só o driver "fake" existe por enquanto; o adaptador de push (PWA) entra na base-B.
export function criarNotifier(config: Pick<Config, "NOTIFIER_DRIVER">): FakeNotifier {
  switch (config.NOTIFIER_DRIVER) {
    case "fake":
      return criarFakeNotifier();
  }
}
