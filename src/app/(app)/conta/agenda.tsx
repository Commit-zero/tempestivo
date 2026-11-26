"use client";

import { Aviso } from "@/components/app/aviso";
import { Check, Copy } from "lucide-react";
import { useActionState, useEffect, useRef, useState } from "react";
import { ConfirmacaoDoEnvio } from "@/components/app/confirmar";
import { BotaoEnviar, Campo, MensagemDoFormulario } from "@/components/formulario";
import { Button } from "@/components/ui/button";
import type { EstadoDoFormulario } from "@/lib/formulario";

export type EstadoDaAgenda = EstadoDoFormulario & { link?: string };
type Acao<T> = (anterior: T, formulario: FormData) => Promise<T>;

export function FormularioDaMargem({ acao, margem, maxima }: { acao: Acao<EstadoDoFormulario>; margem: number; maxima: number }) {
  const [estado, enviar] = useActionState(acao, { valores: { margem: String(margem) } });
  return (
    <form action={enviar} className="grid gap-4">
      <MensagemDoFormulario estado={estado} />
      <Campo
        rotulo="Meta interna: dias úteis antes do vencimento"
        name="margem"
        type="number"
        inputMode="numeric"
        min={0}
        max={maxima}
        required
        defaultValue={estado.valores?.margem}
        dica="Use 0 para não ter meta interna. Vale para todos os prazos, no app e na agenda."
        className="max-w-xs"
      />
      <BotaoEnviar enviando="Salvando…" className="sm:justify-self-start sm:px-5">
        Salvar a margem
      </BotaoEnviar>
    </form>
  );
}

function LinkDaAgenda({ link }: { link: string }) {
  const [copiado, setCopiado] = useState(false);
  const webcal = link.replace(/^https?:\/\//, "webcal://");
  async function copiar() {
    try {
      await navigator.clipboard.writeText(link);
      setCopiado(true);
    } catch {
      setCopiado(false);
    }
  }
  // O link só aparece esta vez: o foco vai até ele, e o leitor de tela o anuncia.
  const bloco = useRef<HTMLDivElement>(null);
  useEffect(() => {
    bloco.current?.focus();
  }, []);
  return (
    <Aviso tipo="sucesso" como="div" semAnuncio ref={bloco} tabIndex={-1} data-testid="link-novo-da-agenda" className="grid gap-3">
      <p className="font-medium text-positivo">Link criado. Copie agora: por segurança, ele não aparece de novo.</p>
      <p className="text-foreground">
        Não compartilhe este link: quem o tiver vê os seus vencimentos até você trocá-lo ou desligar a agenda.
      </p>
      <label className="sr-only" htmlFor="link-da-agenda">
        Link da agenda
      </label>
      <div className="flex gap-2">
        <input
          id="link-da-agenda"
          readOnly
          size={1}
          value={link}
          onFocus={(evento) => evento.currentTarget.select()}
          className="h-11 min-w-0 flex-1 rounded-lg border border-input bg-card px-2.5 font-mono text-sm md:h-9"
        />
        <Button type="button" variant="outline" onClick={copiar} className="w-11 shrink-0 md:w-9" aria-label={copiado ? "Link copiado" : "Copiar o link"}>
          {copiado ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
        </Button>
      </div>
      <p role="status" className="sr-only">
        {copiado ? "Link copiado." : ""}
      </p>
      <ul className="grid list-disc gap-1 pl-5 text-foreground">
        <li>
          <strong>iPhone, Mac e Outlook:</strong>{" "}
          <a href={webcal} className="text-primary underline underline-offset-4">
            assinar com um toque
          </a>
          .
        </li>
        <li>
          <strong>Google Agenda:</strong> no computador, em Outras agendas, escolha &quot;Do URL&quot; e cole o link.
        </li>
      </ul>
    </Aviso>
  );
}

export function PainelDaAgenda({
  ativadaEm, acaoAtivar, acaoDesativar,
}: {
  ativadaEm: string | null;
  acaoAtivar: Acao<EstadoDaAgenda>;
  acaoDesativar: Acao<EstadoDaAgenda>;
}) {
  const [estadoAtivacao, ativar] = useActionState(acaoAtivar, {});
  const [estadoDesativacao, desativar] = useActionState(acaoDesativar, {});
  // Vale só o resultado mais recente: depois de desligar, o link anterior não funciona
  // mais, e depois de criar, o aviso de desligada deixa de ser verdade.
  const [visto, setVisto] = useState<{ ativacao: EstadoDaAgenda; desativacao: EstadoDaAgenda; ultima: "ativacao" | "desativacao" | null }>({
    ativacao: estadoAtivacao, desativacao: estadoDesativacao, ultima: null,
  });
  if (visto.ativacao !== estadoAtivacao) setVisto({ ...visto, ativacao: estadoAtivacao, ultima: "ativacao" });
  else if (visto.desativacao !== estadoDesativacao) setVisto({ ...visto, desativacao: estadoDesativacao, ultima: "desativacao" });
  const resultado = visto.ultima === "desativacao" ? estadoDesativacao : visto.ultima === "ativacao" ? estadoAtivacao : {};
  const link = "link" in resultado ? resultado.link : undefined;
  const ativa = ativadaEm !== null || link !== undefined;
  return (
    <div className="grid gap-4">
      <MensagemDoFormulario estado={resultado} />
      {link ? <LinkDaAgenda key={link} link={link} /> : null}
      {ativa && !link ? (
        <p role="status" className="text-sm text-positivo">
          Agenda ligada desde {ativadaEm}. Se não tiver mais o link, troque-o: o anterior deixa de funcionar.
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <form action={ativar}>
          {ativa ? (
            <ConfirmacaoDoEnvio
              titulo="Trocar o link?"
              descricao="O link atual deixa de funcionar. Quem o assinou precisa do link novo."
              confirmar="Trocar o link"
            >
              <Button type="button" variant="outline">
                Trocar o link
              </Button>
            </ConfirmacaoDoEnvio>
          ) : (
            <BotaoEnviar enviando="Criando…">Criar o link da agenda</BotaoEnviar>
          )}
        </form>
        {ativa ? (
          <form action={desativar}>
            <ConfirmacaoDoEnvio
              titulo="Desligar a agenda?"
              descricao="O link deixa de funcionar e o calendário para de atualizar."
              confirmar="Desligar a agenda"
            >
              <Button type="button" variant="ghost">
                Desligar a agenda
              </Button>
            </ConfirmacaoDoEnvio>
          </form>
        ) : null}
      </div>
    </div>
  );
}
