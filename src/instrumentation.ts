// Roda uma vez quando o servidor inicia (documentação do Next: instrumentation).
// O Next não derruba o processo quando `register` lança erro (fica respondendo 500),
// por isso o encerramento é explícito, só no runtime Node.js.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { getConfig } = await import("@/platform/config");
  const { validarNaSubida } = await import("@/platform/config/subida");
  validarNaSubida(
    getConfig,
    (mensagem) => console.error(mensagem),
    (codigo) => process.exit(codigo),
  );
}
