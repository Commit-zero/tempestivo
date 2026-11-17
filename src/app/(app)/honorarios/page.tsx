import type { Metadata } from "next";
import Link from "next/link";
import { CabecalhoDaPagina, EstadoVazio, ItemDeLink, ListaDeLinks } from "@/components/app/pagina";
import { ResumoFinanceiro } from "@/components/app/resumo-financeiro";
import { Button } from "@/components/ui/button";
import { formatarReais } from "@/lib/dinheiro";
import { listarHonorarios, resumoFinanceiro } from "@/modules/honorarios";
import { exigirSessao } from "@/platform/auth";

export const metadata: Metadata = { title: "Honorários" };

export default async function PaginaDeHonorarios() {
  const { contaId } = await exigirSessao();
  const [honorarios, resumo] = await Promise.all([listarHonorarios(contaId), resumoFinanceiro(contaId)]);
  const novo = (
    <Button asChild>
      <Link href="/honorarios/novo">Novo honorário</Link>
    </Button>
  );
  return (
    <div className="grid gap-6">
      <CabecalhoDaPagina titulo="Honorários" acao={novo} />
      {honorarios.length === 0 ? (
        <EstadoVazio titulo="Nenhum honorário cadastrado." descricao="Cadastre o valor combinado e as parcelas para acompanhar o que falta receber." acao={novo} />
      ) : (
        <>
          <ResumoFinanceiro resumo={resumo} />
          <ListaDeLinks>
            {honorarios.map((honorario) => {
              const pagas = honorario.parcelas.filter((parcela) => parcela.situacao === "paga").length;
              return (
                <ItemDeLink key={honorario.id} href={`/honorarios/${honorario.id}`}>
                  <span className="grid min-w-0 flex-1 gap-0.5">
                    <span className="truncate font-medium">{honorario.descricao}</span>
                    <span className="truncate text-sm text-muted-foreground">
                      {honorario.cliente.nome} · {pagas} de {honorario.parcelas.length} {honorario.parcelas.length === 1 ? "parcela paga" : "parcelas pagas"}
                    </span>
                  </span>
                  <span className="grid shrink-0 justify-items-end gap-0.5 text-sm">
                    <span className="font-medium tabular-nums">{formatarReais(honorario.totalCentavos)}</span>
                    {honorario.emAtrasoCentavos > 0 ? (
                      <span className="text-destructive tabular-nums">{formatarReais(honorario.emAtrasoCentavos)} em atraso</span>
                    ) : null}
                  </span>
                </ItemDeLink>
              );
            })}
          </ListaDeLinks>
        </>
      )}
    </div>
  );
}
