import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * O botão de baixar a planilha, com o filtro que está na tela. É um `<a>` comum, e não
 * o `Link` do Next: ele adiantaria o download só por o botão aparecer. Sem o atributo
 * `download`: o servidor já manda o arquivo como anexo, e assim as mensagens de limite,
 * de erro e de sessão vencida aparecem na aba, em vez de virarem um download estranho.
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
    <div className="grid gap-1.5 sm:justify-items-start">
      <Button asChild variant="outline" className="w-full px-5 sm:w-auto">
        <a href={`/exportar/${lista}${parametros ? `?${parametros}` : ""}`}>
          <Download aria-hidden="true" />
          {rotulo}
        </a>
      </Button>
      <p className="text-sm text-muted-foreground">O arquivo traz dados pessoais dos seus clientes: guarde com cuidado.</p>
    </div>
  );
}
