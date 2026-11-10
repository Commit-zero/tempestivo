import type { Config } from "@/platform/config";
import { criarFakeMailer, type FakeMailer } from "./fake-mailer";

export type { Email, Mailer } from "./mailer";
export { criarFakeMailer, type FakeMailer } from "./fake-mailer";

// Só o driver "fake" existe por enquanto; o adaptador SMTP entra na base-B.
export function criarMailer(config: Pick<Config, "MAILER_DRIVER">): FakeMailer {
  switch (config.MAILER_DRIVER) {
    case "fake":
      return criarFakeMailer();
  }
}
