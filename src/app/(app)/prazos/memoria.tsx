import { Aviso } from "@/components/app/aviso";
import { formatarDataComSemana } from "@/lib/datas";

// "Como contamos": a data calculada nunca aparece sem os passos, os avisos e as regras.
export function MemoriaDoCalculo({
  dataFinal, passos, avisos, regrasAplicadas,
}: {
  dataFinal: string;
  passos: string[];
  avisos: string[];
  regrasAplicadas: string[];
}) {
  return (
    <div className="grid gap-4 rounded-xl border bg-card p-4">
      <div className="grid gap-0.5">
        <p className="text-sm text-muted-foreground">Data final calculada</p>
        <p className="text-xl font-semibold tracking-tight">{formatarDataComSemana(dataFinal)}</p>
      </div>
      <Aviso tipo="atencao" como="ul" className="grid gap-1.5">
        {avisos.map((aviso) => (
          <li key={aviso}>{aviso}</li>
        ))}
      </Aviso>
      <div className="grid gap-2">
        <h3 className="text-sm font-semibold">Como contamos</h3>
        <ol className="grid list-decimal gap-1.5 pl-5 text-sm">
          {passos.map((passo) => (
            <li key={passo}>{passo}</li>
          ))}
        </ol>
      </div>
      <details className="text-sm">
        <summary className="flex min-h-11 cursor-pointer items-center font-medium md:min-h-0">Regras aplicadas ({regrasAplicadas.length})</summary>
        <ul className="mt-2 grid list-disc gap-1.5 pl-5 text-muted-foreground">
          {regrasAplicadas.map((regra) => (
            <li key={regra}>{regra}</li>
          ))}
        </ul>
      </details>
    </div>
  );
}
