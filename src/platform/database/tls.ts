// Parâmetros da string de conexão que o driver `pg` lê para montar o TLS. Quando há
// certificado (DATABASE_CA_CERT), eles saem da URL: no `pg`, o que vem da URL
// sobrescreve o objeto `ssl`, e um `sslmode=require` ou `no-verify` esqueceria o
// certificado sem aviso (em `no-verify`, aceitando qualquer servidor no meio).
const PARAMETROS_DE_TLS = ["sslmode", "ssl", "sslcert", "sslkey", "sslrootcert", "uselibpqcompat"];

export function semParametrosDeTls(url: string): string {
  const consulta = url.indexOf("?");
  if (consulta === -1) return url;
  const parametros = new URLSearchParams(url.slice(consulta + 1));
  for (const nome of PARAMETROS_DE_TLS) parametros.delete(nome);
  const resto = parametros.toString();
  return resto ? `${url.slice(0, consulta)}?${resto}` : url.slice(0, consulta);
}
