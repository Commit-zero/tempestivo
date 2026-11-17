import { anoDe, criarData, somarDias, type DataCivil } from "@/lib/datas";

export type Feriado = { data: DataCivil; nome: string };

/** Domingo de Páscoa pelo algoritmo de Meeus/Jones/Butcher (calendário gregoriano). */
export function pascoa(ano: number): DataCivil {
  const a = ano % 19;
  const b = Math.floor(ano / 100);
  const c = ano % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31);
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  return criarData(ano, mes, dia);
}

// Feriados nacionais (Leis 662/1949, 6.802/1980, 10.607/2002 e 14.759/2023) e a
// Sexta-feira da Paixão. Ela não é feriado nacional: é feriado religioso fixado pelo
// município (Lei 9.093/1995, art. 2º) e feriado forense da Justiça Federal e do
// Trabalho (Lei 5.010/1966, art. 62, II). No TJSP e no TRT-2 não há expediente.
export function feriadosNacionais(ano: number): Feriado[] {
  return [
    { data: criarData(ano, 1, 1), nome: "Confraternização Universal" },
    { data: somarDias(pascoa(ano), -2), nome: "Sexta-feira da Paixão" },
    { data: criarData(ano, 4, 21), nome: "Tiradentes" },
    { data: criarData(ano, 5, 1), nome: "Dia do Trabalho" },
    { data: criarData(ano, 9, 7), nome: "Independência do Brasil" },
    { data: criarData(ano, 10, 12), nome: "Nossa Senhora Aparecida" },
    { data: criarData(ano, 11, 2), nome: "Finados" },
    { data: criarData(ano, 11, 15), nome: "Proclamação da República" },
    { data: criarData(ano, 11, 20), nome: "Consciência Negra" },
    { data: criarData(ano, 12, 25), nome: "Natal" },
  ];
}

// Feriado civil do estado de São Paulo (Lei estadual 9.497/1997).
export function feriadosEstaduaisSP(ano: number): Feriado[] {
  return [{ data: criarData(ano, 7, 9), nome: "Revolução Constitucionalista (SP)" }];
}

// Dias em que o expediente costuma ser suspenso, mas que dependem de portaria de
// cada tribunal a cada ano. Nunca são presumidos: viram aviso, e o advogado
// cadastra o dia sem expediente se a portaria confirmar.
export function pontosDependentesDoTribunal(ano: number): Feriado[] {
  const domingoDePascoa = pascoa(ano);
  return [
    { data: somarDias(domingoDePascoa, -48), nome: "segunda-feira de Carnaval" },
    { data: somarDias(domingoDePascoa, -47), nome: "terça-feira de Carnaval" },
    { data: somarDias(domingoDePascoa, -46), nome: "Quarta-feira de Cinzas" },
    { data: somarDias(domingoDePascoa, -4), nome: "quarta-feira da Semana Santa" },
    { data: somarDias(domingoDePascoa, -3), nome: "quinta-feira da Semana Santa" },
    { data: somarDias(domingoDePascoa, 60), nome: "Corpus Christi" },
    { data: criarData(ano, 1, 25), nome: "aniversário de São Paulo (feriado municipal só na capital)" },
    { data: criarData(ano, 8, 11), nome: "Dia do Advogado (11 de agosto)" },
    { data: criarData(ano, 10, 28), nome: "Dia do Servidor Público" },
    { data: criarData(ano, 11, 1), nome: "Todos os Santos" },
    { data: criarData(ano, 12, 8), nome: "Dia da Justiça" },
  ];
}

// Índice por ano: a calculadora consulta o calendário dia a dia, e montar a lista
// de feriados a cada consulta custaria caro.
export function criarIndiceDeFeriados(feriados: (ano: number) => Feriado[]): (data: DataCivil) => string | undefined {
  const porAno = new Map<number, Map<DataCivil, string>>();
  return (data) => {
    const ano = anoDe(data);
    let doAno = porAno.get(ano);
    if (!doAno) {
      doAno = new Map(feriados(ano).map((feriado) => [feriado.data, feriado.nome]));
      porAno.set(ano, doAno);
    }
    return doAno.get(data);
  };
}
