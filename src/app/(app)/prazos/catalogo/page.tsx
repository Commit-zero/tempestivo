import { ConfirmacaoDoEnvio } from "@/components/app/confirmar";
import { Aviso } from "@/components/app/aviso";
import type { Metadata } from "next";
import { Cartao, CabecalhoDaPagina, Secao } from "@/components/app/pagina";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatarData } from "@/lib/datas";
import { listarDiasSemExpediente, listarTiposDePrazo, TRIBUNAIS } from "@/modules/prazos";
import { exigirSessao } from "@/platform/auth";
import {
  acaoAjustarTipo, acaoCadastrarDiaSemExpediente, acaoCriarTipo, acaoExcluirDiaSemExpediente, acaoRemoverTipo,
} from "../acoes";
import { FormularioDeAjuste, FormularioDeDiaSemExpediente, FormularioDeTipoProprio } from "./formularios";

export const metadata: Metadata = { title: "Catálogo de prazos" };

export default async function PaginaDoCatalogo() {
  const { contaId } = await exigirSessao();
  const [tipos, dias] = await Promise.all([listarTiposDePrazo(contaId), listarDiasSemExpediente(contaId)]);
  const doCatalogo = tipos.filter((tipo) => tipo.origem !== "proprio");
  const proprios = tipos.filter((tipo) => tipo.origem === "proprio");
  return (
    <div className="grid max-w-3xl gap-8">
      <CabecalhoDaPagina titulo="Catálogo de prazos" voltar={{ href: "/prazos", rotulo: "Prazos" }} />
      <Aviso tipo="atencao" role="note">
        Os dias de cada tipo são um ponto de partida e ainda não foram validados por um advogado. O valor usado é responsabilidade sua: confira na lei e ajuste aqui.
      </Aviso>

      <Secao titulo="Tipos do catálogo">
        <ul className="divide-y rounded-xl border bg-card">
          {doCatalogo.map((tipo) => (
            <li key={tipo.id} className="grid gap-2 px-4 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{tipo.nome}</span>
                {tipo.origem === "ajustado" ? <Badge variant="secondary">ajustado por você</Badge> : null}
              </div>
              <p className="text-sm text-muted-foreground">{tipo.referencia}</p>
              <div className="flex flex-wrap items-start gap-2">
                <FormularioDeAjuste acao={acaoAjustarTipo.bind(null, tipo.id)} nome={tipo.nome} dias={tipo.dias} contagem={tipo.contagem} key={`${tipo.dias}-${tipo.contagem}`} />
                {tipo.registroId ? (
                  <form action={acaoRemoverTipo.bind(null, tipo.registroId, "tipo-restaurado")}>
                    <ConfirmacaoDoEnvio
                      titulo="Voltar ao padrão?"
                      descricao={`O seu ajuste em "${tipo.nome}" será apagado, e valem de novo os dias do catálogo.`}
                      confirmar="Voltar ao padrão"
                    >
                      <Button type="button" variant="ghost">
                        Voltar ao padrão
                      </Button>
                    </ConfirmacaoDoEnvio>
                  </form>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      </Secao>

      <Secao titulo="Seus tipos">
        {proprios.length > 0 ? (
          <ul className="divide-y rounded-xl border bg-card">
            {proprios.map((tipo) => (
              <li key={tipo.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                <span>
                  <span className="font-medium">{tipo.nome}</span>{" "}
                  <span className="text-sm text-muted-foreground">
                    {tipo.dias} dias {tipo.contagem === "uteis" ? "úteis" : "corridos"}
                  </span>
                </span>
                <form action={acaoRemoverTipo.bind(null, tipo.registroId ?? "", "tipo-excluido")}>
                  <ConfirmacaoDoEnvio titulo="Excluir tipo?" descricao={`O tipo "${tipo.nome}" será apagado. Os prazos já salvos não mudam.`} confirmar="Excluir tipo">
                    <Button type="button" variant="ghost" aria-label={`Excluir o tipo ${tipo.nome}`}>
                      Excluir
                    </Button>
                  </ConfirmacaoDoEnvio>
                </form>
              </li>
            ))}
          </ul>
        ) : null}
        <Cartao>
          <FormularioDeTipoProprio acao={acaoCriarTipo} />
        </Cartao>
      </Secao>

      <Secao titulo="Dias sem expediente">
        <p className="text-sm text-muted-foreground">
          Carnaval, Corpus Christi, feriados municipais e suspensões por portaria dependem de cada tribunal. A calculadora não presume: cadastre aqui os dias em que não houve expediente e eles deixam de ser contados nos próximos cálculos.
        </p>
        {dias.length > 0 ? (
          <ul className="divide-y rounded-xl border bg-card">
            {dias.map((dia) => (
              <li key={dia.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                <span>
                  <span className="font-medium tabular-nums">{formatarData(dia.data)}</span>{" "}
                  <span className="text-sm text-muted-foreground">
                    {dia.tribunal} · {dia.motivo}
                  </span>
                </span>
                <form action={acaoExcluirDiaSemExpediente.bind(null, dia.id)}>
                  <ConfirmacaoDoEnvio
                    titulo="Excluir dia?"
                    descricao={`${formatarData(dia.data)} volta a ser contado nos próximos cálculos. Os prazos já salvos não mudam.`}
                    confirmar="Excluir dia"
                  >
                    <Button type="button" variant="ghost" aria-label={`Excluir o dia ${formatarData(dia.data)}`}>
                      Excluir
                    </Button>
                  </ConfirmacaoDoEnvio>
                </form>
              </li>
            ))}
          </ul>
        ) : null}
        <Cartao>
          <FormularioDeDiaSemExpediente acao={acaoCadastrarDiaSemExpediente} tribunais={TRIBUNAIS.map((tribunal) => tribunal.sigla)} />
        </Cartao>
      </Secao>
    </div>
  );
}
