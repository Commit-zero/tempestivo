import { describe, expect, it } from "vitest";
import { dobrarLinha, escaparTexto, gerarCalendario } from "./icalendar";

const agora = new Date("2026-11-12T15:00:00Z");
const linhasDe = (ics: string) => ics.replace(/\r\n /g, "").split("\r\n");

describe("iCalendar", () => {
  it("escapa vírgula, ponto e vírgula, barra e qualquer quebra de linha", () => {
    expect(escaparTexto("a,b;c\\d")).toBe("a\\,b\\;c\\\\d");
    expect(escaparTexto("um\r\ndois\rtrês\nquatro")).toBe("um\\ndois\\ntrês\\nquatro");
  });

  it("remove caracteres de controle, que a RFC 5545 proíbe em texto e fariam o calendário recusar o feed", () => {
    expect(escaparTexto("Peça\x0ccolada\x00 do\x1f PDF\x7f\tfim")).toBe("Peçacolada do PDF\tfim");
  });

  it("dobra linhas longas em até 75 bytes sem partir caractere acentuado", () => {
    const linha = `SUMMARY:${"Contestação ".repeat(12)}`;
    const dobrada = dobrarLinha(linha);
    const partes = dobrada.split("\r\n");

    expect(partes.length).toBeGreaterThan(1);
    for (const parte of partes) expect(new TextEncoder().encode(parte).length).toBeLessThanOrEqual(75);
    expect(partes.slice(1).every((parte) => parte.startsWith(" "))).toBe(true);
    expect(dobrada.replace(/\r\n /g, "")).toBe(linha);
    expect(dobrarLinha("curta")).toBe("curta");
  });

  it("gera evento de dia inteiro com fim no dia seguinte, inclusive na virada do ano", () => {
    const ics = gerarCalendario({ eventos: [{ uid: "a@t", titulo: "Vence", quando: { dia: "2026-12-31" } }] }, agora);

    expect(linhasDe(ics)).toEqual(expect.arrayContaining(["DTSTART;VALUE=DATE:20261231", "DTEND;VALUE=DATE:20270101", "TRANSP:TRANSPARENT"]));
  });

  it("gera evento com hora em UTC, lembrete, link e cabeçalho do feed", () => {
    const ics = gerarCalendario(
      {
        nome: "Tempestivo",
        atualizarACadaMin: 60,
        eventos: [{
          uid: "b@t", titulo: "Audiência", quando: { inicio: new Date("2026-11-20T17:30:00Z"), duracaoMin: 90 },
          local: "Fórum, sala 3", url: "https://app.exemplo/prazos/1", lembreteMin: -60,
        }],
      },
      agora,
    );
    const linhas = linhasDe(ics);

    expect(ics.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
    expect(linhas).toEqual(expect.arrayContaining([
      "X-WR-CALNAME:Tempestivo", "REFRESH-INTERVAL;VALUE=DURATION:PT1H", "DTSTART:20261120T173000Z", "DTEND:20261120T190000Z",
      "LOCATION:Fórum\\, sala 3", "URL:https://app.exemplo/prazos/1", "TRIGGER:-PT1H", "DTSTAMP:20261112T150000Z",
    ]));
  });

  it("um \\r no texto não cria propriedade nova", () => {
    const ics = gerarCalendario({ eventos: [{ uid: "c@t", titulo: "T", quando: { dia: "2026-11-20" }, descricao: "a\rATTENDEE:mailto:x@y" }] }, agora);

    expect(linhasDe(ics).some((linha) => linha.startsWith("ATTENDEE"))).toBe(false);
  });

  it("formata lembretes em horas e minutos", () => {
    const comLembrete = (lembreteMin: number) =>
      linhasDe(gerarCalendario({ eventos: [{ uid: "d@t", titulo: "T", quando: { dia: "2026-11-20" }, lembreteMin }] }, agora))
        .find((linha) => linha.startsWith("TRIGGER:"));
    expect(comLembrete(-900)).toBe("TRIGGER:-PT15H");
    expect(comLembrete(540)).toBe("TRIGGER:PT9H");
    expect(comLembrete(-90)).toBe("TRIGGER:-PT1H30M");
    expect(comLembrete(0)).toBe("TRIGGER:PT0M");
  });
});
