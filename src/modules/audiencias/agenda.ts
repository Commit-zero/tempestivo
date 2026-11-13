// Regras puras de audiência: horário de São Paulo, arquivo .ics e link de rota.

// São Paulo está em UTC-3 o ano todo desde 2019 (o horário de verão foi extinto).
const FUSO_DE_SAO_PAULO = "-03:00";

/** Instante de uma data e hora digitadas no horário de São Paulo. */
export function instanteEmSaoPaulo(data: string, hora: string): Date {
  return new Date(`${data}T${hora}:00${FUSO_DE_SAO_PAULO}`);
}

/** Data ('AAAA-MM-DD') e hora ('HH:MM') de São Paulo de um instante, para preencher o formulário. */
export function dataEHoraEmSaoPaulo(instante: Date): { data: string; hora: string } {
  const local = new Date(instante.getTime() - 3 * 60 * 60 * 1000).toISOString();
  return { data: local.slice(0, 10), hora: local.slice(11, 16) };
}

export type EventoDeAgenda = {
  id: string;
  titulo: string;
  inicio: Date;
  duracaoMin: number;
  local: string | null;
  descricao: string | null;
};

const paraIcs = (instante: Date) => instante.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

// RFC 5545: vírgula, ponto e vírgula e barra invertida são escapados; quebra de linha vira \n.
const escapar = (texto: string) => texto.replace(/\\/g, "\\\\").replace(/([,;])/g, "\\$1").replace(/\r?\n/g, "\\n");

/** Arquivo iCalendar (.ics) de um evento, aceito por Google Agenda, Outlook e Apple. */
export function gerarIcs(evento: EventoDeAgenda, agora: Date): string {
  const fim = new Date(evento.inicio.getTime() + evento.duracaoMin * 60_000);
  const linhas = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Tempestivo//Audiencias//PT-BR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${evento.id}@tempestivo`,
    `DTSTAMP:${paraIcs(agora)}`,
    `DTSTART:${paraIcs(evento.inicio)}`,
    `DTEND:${paraIcs(fim)}`,
    `SUMMARY:${escapar(evento.titulo)}`,
    ...(evento.local ? [`LOCATION:${escapar(evento.local)}`] : []),
    ...(evento.descricao ? [`DESCRIPTION:${escapar(evento.descricao)}`] : []),
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    "DESCRIPTION:Audiência em 1 hora",
    "TRIGGER:-PT1H",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return `${linhas.join("\r\n")}\r\n`;
}

/** Link de rota no Google Maps para o endereço da audiência. */
export function linkDeRota(local: string): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(local)}`;
}
