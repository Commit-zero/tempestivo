import { describe, expect, it } from "vitest";
import { semParametrosDeTls } from "./tls";

describe("semParametrosDeTls", () => {
  it("tira da URL os parâmetros de TLS, que no pg sobrescreveriam o certificado", () => {
    const url = "postgresql://u:s@host.exemplo.com:6543/postgres?pgbouncer=true&sslmode=no-verify&sslrootcert=/x.pem";
    expect(semParametrosDeTls(url)).toBe("postgresql://u:s@host.exemplo.com:6543/postgres?pgbouncer=true");
  });

  it("mantém a URL sem parâmetros de TLS como está", () => {
    const url = "postgresql://u:s@host.exemplo.com:6543/postgres?pgbouncer=true";
    expect(semParametrosDeTls(url)).toBe(url);
    expect(semParametrosDeTls("postgresql://u:s@localhost:5432/b")).toBe("postgresql://u:s@localhost:5432/b");
  });

  it("preserva usuário e senha com caracteres codificados", () => {
    const url = "postgresql://postgres.abc:p%40ss%2Fw@host.exemplo.com:5432/postgres?ssl=true";
    expect(semParametrosDeTls(url)).toBe("postgresql://postgres.abc:p%40ss%2Fw@host.exemplo.com:5432/postgres");
  });
});
