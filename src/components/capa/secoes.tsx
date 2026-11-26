// O texto da capa. Regra: só o que o sistema faz hoje; nada do roteiro futuro, nenhum
// depoimento, número de clientes ou selo.

const PROBLEMAS_E_SOLUCOES = [
  {
    problema: "Contar o prazo no meio de feriado e suspensão",
    solucao:
      "A calculadora conta em dias úteis, pula fins de semana, feriados nacionais, o 9 de julho e a suspensão de 20/12 a 20/01, e mostra o passo a passo. Feriado municipal e dia de portaria você cadastra, e valem nos cálculos seguintes. Quando conta um dia que pode não ter tido expediente, ela avisa.",
  },
  {
    problema: "Achar que alguém já conferiu",
    solucao: "Cada prazo mostra há quantos dias você mesmo conferiu. Nada aparece como conferido sem o seu registro.",
  },
  {
    problema: "Descobrir o vencimento tarde demais",
    solucao:
      "E-mails 5, 2 e 1 dia útil antes e no dia do vencimento, que saem depois que você confirma o seu e-mail. A meta interna marca quando o trabalho deve estar pronto e aparece no seu calendário se você assinar a agenda.",
  },
  {
    problema: "Não saber quem está devendo",
    solucao: "Parcelas e atrasos num lugar só, com a mensagem de cobrança pronta para você enviar pelo WhatsApp.",
  },
];

const DIFERENCIAIS = [
  { titulo: "A contagem vem explicada", texto: "O dia do começo, os feriados e dias sem expediente que ficaram de fora, com o motivo, e as regras usadas." },
  { titulo: "Status honesto", texto: "“Conferido há 3 dias” diz mais que um sinal verde que ninguém verificou." },
  {
    titulo: "O leitor de intimação só sugere",
    texto: "Você cola o texto e recebe um rascunho que mostra os trechos usados. O prazo só existe depois da sua confirmação, e o texto não vai para terceiros.",
  },
  {
    titulo: "Um colega é avisado",
    texto: "Se um prazo chega à véspera sem conferência, o advogado substituto que você indicou, e que aceitou o convite, recebe um aviso com a data.",
  },
];

export function ProblemasESolucoes() {
  return (
    <section aria-labelledby="titulo-problemas" className="grid gap-6">
      <h2 id="titulo-problemas" className="max-w-2xl text-2xl font-bold tracking-tight text-balance sm:text-3xl">
        Onde o prazo se perde, e o que o Tempestivo faz
      </h2>
      <ul className="grid border-t">
        {PROBLEMAS_E_SOLUCOES.map(({ problema, solucao }) => (
          <li key={problema} className="grid gap-2 border-b py-5 md:grid-cols-[2fr_3fr] md:gap-10">
            <h3 className="text-lg font-semibold text-balance">{problema}</h3>
            <p className="max-w-[62ch] text-muted-foreground">{solucao}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function Diferenciais() {
  return (
    <section aria-labelledby="titulo-diferenciais" className="grid gap-6">
      <h2 id="titulo-diferenciais" className="text-2xl font-bold tracking-tight sm:text-3xl">
        No que o Tempestivo insiste
      </h2>
      <dl className="grid gap-x-10 gap-y-6 sm:grid-cols-2">
        {DIFERENCIAIS.map(({ titulo, texto }) => (
          <div key={titulo} className="grid content-start gap-1.5 border-l-4 border-primary pl-4">
            <dt className="font-semibold">{titulo}</dt>
            <dd className="text-muted-foreground">{texto}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
