"use client";

import { useActionState, useState } from "react";
import { BotaoEnviar, Campo, MensagemDoFormulario } from "@/components/formulario";
import { Button } from "@/components/ui/button";
import type { EstadoDoFormulario } from "@/lib/formulario";

export type EstadoDoInicio = { erro?: string; qrCode?: string; chave?: string };
export type EstadoDaConfirmacao = { erro?: string; codigos?: string[]; atencao?: string };

type Acao<Estado> = (anterior: Estado, formulario: FormData) => Promise<Estado>;

type Props = {
  ligado: boolean;
  emailConfirmado: boolean;
  acaoIniciar: Acao<EstadoDoInicio>;
  acaoConfirmar: Acao<EstadoDaConfirmacao>;
  acaoGerarCodigos: Acao<EstadoDaConfirmacao>;
  acaoDesativar: Acao<EstadoDoFormulario>;
};

const botao = "sm:justify-self-start sm:px-5";

// Um componente só para todas as fases: ao ligar, a página muda `ligado` e os códigos
// de recuperação, que só existem no estado daqui, continuam na tela.
export function SegundoFator({ ligado, emailConfirmado, acaoIniciar, acaoConfirmar, acaoGerarCodigos, acaoDesativar }: Props) {
  const [inicio, iniciar] = useActionState(acaoIniciar, {});
  const [confirmacao, confirmar] = useActionState(acaoConfirmar, {});
  const [novos, gerar] = useActionState(acaoGerarCodigos, {});
  const [desligamento, desativar] = useActionState(acaoDesativar, {});

  const codigos = ligado ? (novos.codigos ?? confirmacao.codigos) : undefined;
  if (codigos) return <CodigosDeRecuperacao codigos={codigos} atencao={novos.codigos ? undefined : confirmacao.atencao} />;

  if (ligado) {
    return (
      <div className="grid gap-6">
        <p className="text-sm text-positivo">
          <strong>Ligada.</strong> O login pede o código do aplicativo.
        </p>
        {confirmacao.erro ? <MensagemDoFormulario estado={confirmacao} /> : null}
        <form action={gerar} className="grid gap-4">
          <MensagemDoFormulario estado={novos} />
          <Campo
            rotulo="Sua senha, para gerar códigos novos"
            name="senha"
            type="password"
            autoComplete="current-password"
            required
            maxLength={128}
            dica="Os códigos de recuperação anteriores deixam de valer."
          />
          <BotaoEnviar variant="outline" enviando="Gerando…" className={botao}>
            Gerar códigos novos
          </BotaoEnviar>
        </form>
        <form action={desativar} className="grid gap-4 border-t pt-6">
          <MensagemDoFormulario estado={desligamento} />
          <Campo rotulo="Sua senha, para desativar" name="senha" type="password" autoComplete="current-password" required maxLength={128} />
          <BotaoEnviar variant="destructive" enviando="Desativando…" className={botao}>
            Desativar a verificação em duas etapas
          </BotaoEnviar>
        </form>
      </div>
    );
  }

  if (!emailConfirmado) {
    return <p className="text-sm">Para ligar, confirme antes o seu e-mail. O link de confirmação pode ser reenviado pelo Painel.</p>;
  }

  if (inicio.qrCode && inicio.chave) {
    return (
      <div className="grid gap-4">
        <ol className="grid list-decimal gap-1 pl-5 text-sm">
          <li>No aplicativo autenticador (Google Authenticator, Microsoft Authenticator ou outro), adicione uma conta.</li>
          <li>Leia o QR code ou digite a chave.</li>
          <li>Digite abaixo o código de 6 números que o aplicativo mostrar.</li>
        </ol>
        {/* eslint-disable-next-line @next/next/no-img-element -- imagem gerada no servidor, sem endereço para otimizar */}
        <img src={inicio.qrCode} alt="QR code para o aplicativo autenticador" width={208} height={208} className="justify-self-center rounded-lg bg-white" />
        <p className="text-sm">
          Chave para digitar à mão:{" "}
          <code data-testid="chave-do-autenticador" className="font-mono break-all">
            {inicio.chave.match(/.{1,4}/g)?.join(" ")}
          </code>
        </p>
        <form action={confirmar} className="grid gap-4">
          <MensagemDoFormulario estado={confirmacao} />
          <Campo rotulo="Código de 6 números" name="codigo" autoComplete="one-time-code" inputMode="numeric" required maxLength={8} />
          <BotaoEnviar enviando="Conferindo…" className={botao}>
            Confirmar e ligar
          </BotaoEnviar>
        </form>
      </div>
    );
  }

  return (
    <form action={iniciar} className="grid gap-4">
      <MensagemDoFormulario estado={desligamento.aviso ? desligamento : inicio} />
      <Campo rotulo="Sua senha, para ligar" name="senha" type="password" autoComplete="current-password" required maxLength={128} />
      <BotaoEnviar enviando="Preparando…" className={botao}>
        Ligar a verificação em duas etapas
      </BotaoEnviar>
    </form>
  );
}

function CodigosDeRecuperacao({ codigos, atencao }: { codigos: string[]; atencao?: string }) {
  const [copiados, setCopiados] = useState<boolean | null>(null);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(codigos.join("\n"));
      setCopiados(true);
    } catch {
      setCopiados(false);
    }
  }

  return (
    <div className="grid gap-4">
      <p role="status" className="rounded-lg border border-atencao/30 px-3 py-2 text-sm">
        <strong>Guarde os códigos de recuperação agora: eles não aparecem de novo.</strong> Cada um entra uma única vez, caso você
        fique sem o celular. Guarde num lugar seguro, separado do aparelho. Sem o celular e sem eles, o acesso depende de atendimento
        manual.
      </p>
      {atencao ? <MensagemDoFormulario estado={{ erro: atencao }} /> : null}
      <ul aria-label="Códigos de recuperação" className="grid grid-cols-2 gap-2 font-mono text-sm">
        {codigos.map((codigo) => (
          <li key={codigo} className="rounded-md border px-2 py-1 text-center">
            {codigo}
          </li>
        ))}
      </ul>
      <Button type="button" variant="outline" onClick={copiar} className={botao}>
        Copiar os códigos
      </Button>
      <p aria-live="polite" className="text-sm text-muted-foreground">
        {copiados === null ? "" : copiados ? "Códigos copiados." : "Não foi possível copiar. Anote os códigos."}
      </p>
      {/* Recarregar tira os códigos da memória da página. */}
      <Button type="button" onClick={() => window.location.reload()} className={botao}>
        Já guardei os códigos
      </Button>
    </div>
  );
}
