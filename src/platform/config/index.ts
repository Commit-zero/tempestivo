import { lerConfig, type Config } from "./env";

export { ErroDeConfiguracao, lerConfig, type Config } from "./env";

let emCache: Config | undefined;

export function getConfig(): Config {
  emCache ??= lerConfig(process.env);
  return emCache;
}
