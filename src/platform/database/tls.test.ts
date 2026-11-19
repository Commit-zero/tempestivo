import { describe, expect, it } from "vitest";
import { semParametrosDeTls } from "./tls";

// URLs sem senha: a função só mexe na consulta, e string de conexão com senha, mesmo
// falsa, é o que o detector de segredos do CI procura.
describe("semParametrosDeTls", () => {
  it("tira da URL os parâmetros de TLS, que no pg sobrescreveriam o certificado", () => {
    const url = "postgresql://usuario@host.exemplo.com:6543/postgres?pgbouncer=true&sslmode=no-verify&sslrootcert=/x.pem";
    expect(semParametrosDeTls(url)).toBe("postgresql://usuario@host.exemplo.com:6543/postgres?pgbouncer=true");
  });

  it("mantém a URL sem parâmetros de TLS como está", () => {
    const url = "postgresql://usuario@host.exemplo.com:6543/postgres?pgbouncer=true";
    expect(semParametrosDeTls(url)).toBe(url);
    expect(semParametrosDeTls("postgresql://usuario@localhost:5432/b")).toBe("postgresql://usuario@localhost:5432/b");
  });

  it("mantém usuário com ponto e preserva a codificação dos parâmetros que ficam", () => {
    const url = "postgresql://postgres.abc@host.exemplo.com:5432/postgres?application_name=a%2Fb&ssl=true";
    expect(semParametrosDeTls(url)).toBe("postgresql://postgres.abc@host.exemplo.com:5432/postgres?application_name=a%2Fb");
  });
});
