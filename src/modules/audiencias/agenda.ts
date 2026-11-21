import { gerarCalendario } from "@/lib/icalendar";

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

/** Arquivo iCalendar (.ics) de uma audiência, com lembrete 1 hora antes. */
export function gerarIcs(evento: EventoDeAgenda, agora: Date): string {
  return gerarCalendario(
    {
      eventos: [{
        uid: `${evento.id}@tempestivo`,
        titulo: evento.titulo,
        quando: { inicio: evento.inicio, duracaoMin: evento.duracaoMin },
        local: evento.local,
        descricao: evento.descricao,
        lembreteMin: -60,
      }],
    },
    agora,
  );
}

/** Link de rota no Google Maps para o endereço da audiência. */
export function linkDeRota(local: string): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(local)}`;
}
