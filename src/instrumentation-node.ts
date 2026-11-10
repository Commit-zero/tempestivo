import { getConfig } from "@/platform/config";
import { validarNaSubida } from "@/platform/config/subida";

// Só o runtime Node.js carrega este arquivo (ver instrumentation.ts). O Next não
// derruba o processo quando `register` lança erro (fica respondendo 500), por isso
// o encerramento é explícito.
export function validarConfiguracaoNaSubida() {
  validarNaSubida(
    getConfig,
    (mensagem) => console.error(mensagem),
    (codigo) => process.exit(codigo),
  );
}
