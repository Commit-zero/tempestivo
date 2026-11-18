import type { DataCivil } from "./datas";

// Gerador de iCalendar (RFC 5545): o arquivo .ics de uma audiência e o feed da
// agenda assinável. Só o que o produto usa: eventos com hora ou de dia inteiro,
// descrição, local, link e lembrete.

export type Quando =
  | { inicio: Date; duracaoMin: number }
  /** Dia inteiro, numa data civil: prazo e meta não têm hora. */
  | { dia: DataCivil };

export type EventoIcs = {
  /** Estável entre gerações: é o que faz o calendário atualizar o evento em vez de duplicar. */
  uid: string;
  titulo: string;
  quando: Quando;
  local?: string | null;
  descricao?: string | null;
  url?: string | null;
  /** Lembrete relativo ao início, em minutos (negativo: antes). */
  lembreteMin?: number;
};

export type Calendario = {
  nome?: string;
  /** Sugere ao aplicativo de calendário de quanto em quanto tempo buscar o feed de novo. */
  atualizarACadaMin?: number;
  eventos: EventoIcs[];
};

const LIMITE_DA_LINHA = 75;
const codificador = new TextEncoder();

// Vírgula, ponto e vírgula e barra invertida são escapados; qualquer quebra de linha
// (inclusive um \r sozinho) vira \n, para o texto não criar uma propriedade nova.
// Os demais caracteres de controle (menos a tabulação) saem: a RFC 5545 os proíbe em
// texto, e um deles colado de um PDF faria o calendário recusar o feed inteiro.
const CONTROLES_PROIBIDOS = /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g;

export function escaparTexto(texto: string): string {
  return texto
    .replace(CONTROLES_PROIBIDOS, "")
    .replace(/\\/g, "\\\\")
    .replace(/([,;])/g, "\\$1")
    .replace(/\r\n|\r|\n/g, "\\n");
}

/** Dobra a linha em pedaços de até 75 bytes, sem partir um caractere UTF-8 ao meio. */
export function dobrarLinha(linha: string): string {
  if (codificador.encode(linha).length <= LIMITE_DA_LINHA) return linha;
  const partes: string[] = [];
  let atual = "";
  let bytes = 0;
  for (const caractere of linha) {
    const tamanho = codificador.encode(caractere).length;
    // A continuação começa com um espaço, que conta no limite.
    const limite = partes.length === 0 ? LIMITE_DA_LINHA : LIMITE_DA_LINHA - 1;
    if (bytes + tamanho > limite) {
      partes.push(atual);
      atual = "";
      bytes = 0;
    }
    atual += caractere;
    bytes += tamanho;
  }
  partes.push(atual);
  return partes.join("\r\n ");
}

const instanteIcs = (instante: Date) => instante.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const dataIcs = (data: DataCivil) => data.replace(/-/g, "");

function diaSeguinte(data: DataCivil): DataCivil {
  const proximo = new Date(`${data}T00:00:00Z`);
  proximo.setUTCDate(proximo.getUTCDate() + 1);
  return proximo.toISOString().slice(0, 10);
}

function duracaoIcs(minutos: number): string {
  const sinal = minutos < 0 ? "-" : "";
  const total = Math.abs(minutos);
  const horas = Math.floor(total / 60);
  const resto = total % 60;
  return `${sinal}PT${horas > 0 ? `${horas}H` : ""}${resto > 0 || horas === 0 ? `${resto}M` : ""}`;
}

function linhasDoEvento(evento: EventoIcs, agora: Date): string[] {
  const linhas = ["BEGIN:VEVENT", `UID:${evento.uid}`, `DTSTAMP:${instanteIcs(agora)}`];
  if ("dia" in evento.quando) {
    linhas.push(`DTSTART;VALUE=DATE:${dataIcs(evento.quando.dia)}`, `DTEND;VALUE=DATE:${dataIcs(diaSeguinte(evento.quando.dia))}`);
    linhas.push("TRANSP:TRANSPARENT");
  } else {
    const fim = new Date(evento.quando.inicio.getTime() + evento.quando.duracaoMin * 60_000);
    linhas.push(`DTSTART:${instanteIcs(evento.quando.inicio)}`, `DTEND:${instanteIcs(fim)}`);
  }
  linhas.push(`SUMMARY:${escaparTexto(evento.titulo)}`);
  if (evento.local) linhas.push(`LOCATION:${escaparTexto(evento.local)}`);
  if (evento.descricao) linhas.push(`DESCRIPTION:${escaparTexto(evento.descricao)}`);
  if (evento.url) linhas.push(`URL:${evento.url}`);
  if (evento.lembreteMin !== undefined) {
    linhas.push(
      "BEGIN:VALARM",
      "ACTION:DISPLAY",
      `DESCRIPTION:${escaparTexto(evento.titulo)}`,
      `TRIGGER:${duracaoIcs(evento.lembreteMin)}`,
      "END:VALARM",
    );
  }
  linhas.push("END:VEVENT");
  return linhas;
}

/** Arquivo iCalendar completo, com quebras CRLF e linhas dobradas. */
export function gerarCalendario({ nome, atualizarACadaMin, eventos }: Calendario, agora: Date): string {
  const linhas = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Tempestivo//Agenda//PT-BR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    ...(nome ? [`X-WR-CALNAME:${escaparTexto(nome)}`, "X-WR-TIMEZONE:America/Sao_Paulo"] : []),
    ...(atualizarACadaMin
      ? [`REFRESH-INTERVAL;VALUE=DURATION:${duracaoIcs(atualizarACadaMin)}`, `X-PUBLISHED-TTL:${duracaoIcs(atualizarACadaMin)}`]
      : []),
    ...eventos.flatMap((evento) => linhasDoEvento(evento, agora)),
    "END:VCALENDAR",
  ];
  return `${linhas.map(dobrarLinha).join("\r\n")}\r\n`;
}
