import { cn } from "cn";
import { formatarReais } from "@/lib/dinheiro";
import type { ResumoFinanceiro as Resumo } from "@/modules/honorarios";

// Três números do mês, usados na tela de honorários e no painel.
export function ResumoFinanceiro({ resumo }: { resumo: Resumo }) {
  const itens = [
    { rotulo: "A receber", valor: resumo.aReceberCentavos, destaque: "" },
    {
      rotulo: resumo.parcelasEmAtraso === 1 ? "Em atraso (1 parcela)" : `Em atraso (${resumo.parcelasEmAtraso} parcelas)`,
      valor: resumo.emAtrasoCentavos,
      destaque: resumo.emAtrasoCentavos > 0 ? "text-destructive" : "",
    },
    { rotulo: "Recebido neste mês", valor: resumo.recebidoNoMesCentavos, destaque: "text-positivo" },
  ];
  return (
    <dl className="grid gap-3 sm:grid-cols-3">
      {itens.map((item) => (
        <div key={item.rotulo} className="rounded-xl border bg-card p-4">
          <dt className="text-sm text-muted-foreground">{item.rotulo}</dt>
          <dd className={cn("mt-1 text-xl font-semibold tracking-tight tabular-nums", item.destaque)}>{formatarReais(item.valor)}</dd>
        </div>
      ))}
    </dl>
  );
}
