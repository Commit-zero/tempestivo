import type { Config } from "@/platform/config";
import { criarFakeStorage, type FakeStorage } from "./fake-storage";

export type { Storage } from "./storage";
export { criarFakeStorage, type FakeStorage } from "./fake-storage";

// Só o driver "fake" existe por enquanto; o adaptador real (S3) entra na base-B.
export function criarStorage(config: Pick<Config, "STORAGE_DRIVER">): FakeStorage {
  switch (config.STORAGE_DRIVER) {
    case "fake":
      return criarFakeStorage();
  }
}
