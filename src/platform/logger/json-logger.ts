import { ordemDosNiveis, type Contexto, type Logger, type NivelLog } from "./logger";

const OCULTO = "[oculto]";
const OMITIDO = "[omitido]";

// Segredos e dados pessoais (LGPD). A redação é por nome de campo; o texto de `msg` não é vigiado.
const trechosSensiveis = [
  "senha", "password", "token", "secret", "authorization", "cookie", "database_url",
  "cpf", "cnpj", "telefone", "celular", "email", "texto", "conteudo", "intimacao", "api_key", "apikey",
];

function nomeSensivel(nome: string): boolean {
  const minusculo = nome.toLowerCase();
  return trechosSensiveis.some((trecho) => minusculo.includes(trecho));
}

function ehObjeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === "object" && valor !== null && !Array.isArray(valor);
}

// A redação é pelo nome do campo, nunca pelo valor. Só um nível de aninhamento é
// vigiado; abaixo disso o valor não sai, porque não dá para garantir que não há segredo.
function ocultarSegredos(contexto: Record<string, unknown>, nivelDeAninhamento = 0): Record<string, unknown> {
  const saida: Record<string, unknown> = {};
  for (const [nome, valor] of Object.entries(contexto)) {
    if (nomeSensivel(nome)) {
      saida[nome] = OCULTO;
    } else if (ehObjeto(valor)) {
      saida[nome] = nivelDeAninhamento === 0 ? ocultarSegredos(valor, 1) : OMITIDO;
    } else if (Array.isArray(valor)) {
      saida[nome] = OMITIDO;
    } else {
      saida[nome] = valor;
    }
  }
  return saida;
}

export type OpcoesJsonLogger = {
  nivel: NivelLog;
  escrever?: (linha: string) => void;
  agora?: () => Date;
  contexto?: Contexto;
};

export function criarJsonLogger({
  nivel,
  escrever = (linha) => process.stdout.write(`${linha}\n`),
  agora = () => new Date(),
  contexto: contextoBase = {},
}: OpcoesJsonLogger): Logger {
  function registrar(nivelDaChamada: NivelLog, msg: string, ctx: Contexto = {}): void {
    if (ordemDosNiveis[nivelDaChamada] < ordemDosNiveis[nivel]) return;
    const registro = {
      ...ocultarSegredos({ ...contextoBase, ...ctx }),
      nivel: nivelDaChamada,
      msg,
      em: agora().toISOString(),
    };
    try {
      escrever(JSON.stringify(registro));
    } catch {
      escrever(JSON.stringify({ nivel: "error", msg: "falha ao serializar o log", em: registro.em }));
    }
  }

  return {
    debug: (msg, ctx) => registrar("debug", msg, ctx),
    info: (msg, ctx) => registrar("info", msg, ctx),
    warn: (msg, ctx) => registrar("warn", msg, ctx),
    error: (msg, ctx) => registrar("error", msg, ctx),
    filho: (ctx) => criarJsonLogger({ nivel, escrever, agora, contexto: { ...contextoBase, ...ctx } }),
  };
}
