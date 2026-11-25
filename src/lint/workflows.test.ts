import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// Regras dos workflows num repositório público. Leitura por texto, sem dependência de YAML.
const pasta = path.resolve(__dirname, "../../.github/workflows");
const ler = (nome: string) => readFileSync(path.join(pasta, nome), "utf8").replace(/\r\n/g, "\n");
const todos = readdirSync(pasta).filter((nome) => nome.endsWith(".yml"));

/** O bloco `on:`, sem os comentários. */
function gatilhos(nome: string): string {
  const semComentarios = ler(nome).replace(/^\s*#.*\n/gm, "");
  return /^on:\n((?:[ \t].*\n|\n)+)/m.exec(semComentarios)?.[1] ?? "";
}

describe("workflows", () => {
  it.each(["ci.yml", "seguranca.yml"])("%s verifica PR (inclusive de fork) e a main", (nome) => {
    expect(gatilhos(nome)).toMatch(/^ {2}pull_request:$/m);
    expect(gatilhos(nome)).toMatch(/^ {2}push:\n {4}branches: \[main\]$/m);
  });

  it.each(todos)("%s não usa pull_request_target", (nome) => {
    expect(gatilhos(nome)).not.toContain("pull_request_target");
  });

  it.each(["ci.yml", "seguranca.yml"])("%s não recebe segredos e só lê o repositório", (nome) => {
    expect(ler(nome)).not.toMatch(/\$\{\{\s*secrets\./);
    expect(ler(nome)).toMatch(/^permissions:\n {2}contents: read$/m);
    expect(ler(nome)).not.toMatch(/:\s*write\b/);
  });

  it.each(todos)("%s fixa toda action por SHA de commit", (nome) => {
    const usos = [...ler(nome).matchAll(/^\s*(?:- )?uses:\s*(\S+)/gm)].map((achado) => achado[1]);
    for (const uso of usos) expect(uso).toMatch(/@[0-9a-f]{40}$/);
  });

  it("a varredura pesada da imagem não roda em PR", () => {
    expect(ler("seguranca.yml")).toContain("if: github.event_name != 'pull_request'");
  });
});
