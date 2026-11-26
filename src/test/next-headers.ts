// Substitui `next/headers` nos testes de integração: um navegador de mentira, com um
// pote de cookies em memória. Assim os casos de uso de autenticação (e o plugin que
// grava os cookies nas server actions) rodam contra o Postgres sem um servidor Next.
// Diferença para o Next: aqui `headers()` já traz os cookies recém-gravados; no Next, só
// `cookies()` traz. Esse caso é coberto pelos testes de tela.
// Uso no teste: vi.mock("next/headers", () => import("@/test/next-headers"));

type Navegador = { ip: string; cookies: Map<string, string> };

let atual: Navegador = { ip: "203.0.113.1", cookies: new Map() };

/** Um navegador novo, sem cookies. Guarde o retorno para voltar a ele depois. */
export function novoNavegador(ip = "203.0.113.1"): Navegador {
  atual = { ip, cookies: new Map() };
  return atual;
}

export function usarNavegador(navegador: Navegador): void {
  atual = navegador;
}

export async function headers(): Promise<Headers> {
  const cabecalhos = new Headers({ "x-forwarded-for": atual.ip });
  if (atual.cookies.size > 0) {
    cabecalhos.set("cookie", [...atual.cookies].map(([nome, valor]) => `${nome}=${encodeURIComponent(valor)}`).join("; "));
  }
  return cabecalhos;
}

export async function cookies() {
  const navegador = atual;
  return {
    toString: () => [...navegador.cookies].map(([nome, valor]) => `${nome}=${encodeURIComponent(valor)}`).join("; "),
    set(nome: string, valor: string, opcoes?: { maxAge?: number; expires?: Date }) {
      const expirado = opcoes?.maxAge === 0 || (opcoes?.expires !== undefined && opcoes.expires.getTime() <= Date.now());
      if (expirado || !valor) navegador.cookies.delete(nome);
      else navegador.cookies.set(nome, valor);
    },
  };
}
