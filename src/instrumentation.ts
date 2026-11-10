// Roda uma vez quando o servidor inicia (documentação do Next: instrumentation).
// O código que usa APIs do Node fica em instrumentation-node.ts, importado só no runtime nodejs.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { validarConfiguracaoNaSubida } = await import("./instrumentation-node");
  validarConfiguracaoNaSubida();
}
