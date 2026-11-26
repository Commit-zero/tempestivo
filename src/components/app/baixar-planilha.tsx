import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * O botão de baixar a planilha, com o filtro que está na tela. É um `<a>` comum, e não
 * o `Link` do Next: ele adiantaria o download só por o botão aparecer.
 */
export function BaixarPlanilha({ lista, filtros = {}, rotulo = "Baixar planilha" }: {
  lista: string;
  filtros?: Record<string, string | undefined>;
  rotulo?: string;
}) {
  const parametros = new URLSearchParams(
    Object.entries(filtros).filter((par): par is [string, string] => Boolean(par[1])),
  ).toString();
  return (
    <div className="grid justify-items-start gap-1.5">
      <Button asChild variant="outline" className="h-11 px-4 md:h-9">
        <a href={`/exportar/${lista}${parametros ? `?${parametros}` : ""}`} download>
          <Download aria-hidden="true" />
          {rotulo}
        </a>
      </Button>
      <p className="text-xs text-muted-foreground">O arquivo traz dados pessoais dos seus clientes: guarde com cuidado.</p>
    </div>
  );
}
