import { BaixarPlanilha } from "@/components/app/baixar-planilha";
import type { Metadata } from "next";
import Link from "next/link";
import { ListaDeAudiencias } from "@/components/app/audiencia";
import { CabecalhoDaPagina, EstadoVazio, Secao } from "@/components/app/pagina";
import { Button } from "@/components/ui/button";
import { listarAudienciasPassadas, listarProximasAudiencias } from "@/modules/audiencias";
import { exigirSessao } from "@/platform/auth";

export const metadata: Metadata = { title: "Audiências" };

export default async function PaginaDeAudiencias() {
  const { contaId } = await exigirSessao();
  const [proximas, passadas] = await Promise.all([listarProximasAudiencias(contaId), listarAudienciasPassadas(contaId)]);
  const nova = (
    <Button asChild>
      <Link href="/audiencias/nova">Nova audiência</Link>
    </Button>
  );
  return (
    <div className="grid gap-8">
      <CabecalhoDaPagina titulo="Audiências" acao={nova} />
      <BaixarPlanilha lista="audiencias" />
      <Secao titulo="Próximas">
        {proximas.length === 0 ? (
          <EstadoVazio titulo="Nenhuma audiência marcada." descricao="Cadastre a audiência para ter a rota, a sala virtual e o arquivo da agenda à mão no dia." acao={nova} />
        ) : (
          <ListaDeAudiencias audiencias={proximas} />
        )}
      </Secao>
      {passadas.length > 0 ? (
        <Secao titulo="Realizadas">
          <ListaDeAudiencias audiencias={passadas} />
        </Secao>
      ) : null}
    </div>
  );
}
