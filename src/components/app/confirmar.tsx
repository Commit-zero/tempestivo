"use client";

import { useActionState, useRef, type ComponentProps, type ReactElement } from "react";
import { useFormStatus } from "react-dom";
import { AlertDialog } from "radix-ui";
import { MensagemDoFormulario } from "@/components/formulario";
import { Button } from "@/components/ui/button";
import { CAMPO_DE_CONFIRMACAO, VALOR_CONFIRMADO } from "@/lib/confirmacao";
import type { EstadoDoFormulario } from "@/lib/formulario";

/**
 * Pede confirmação antes de enviar o formulário em que está. O botão da tela (`children`)
 * só abre o diálogo; quem envia é um botão escondido que leva a confirmação, e o
 * servidor recusa o envio sem ela. O foco começa em "Cancelar" e volta ao botão da tela.
 */
export function ConfirmacaoDoEnvio({
  titulo, descricao, confirmar, children,
}: {
  titulo: string;
  descricao: string;
  /** Texto do botão que confirma: o verbo e o que ele apaga. */
  confirmar: string;
  children: ReactElement;
}) {
  const envio = useRef<HTMLButtonElement>(null);
  const { pending } = useFormStatus();
  return (
    <>
      <button ref={envio} type="submit" name={CAMPO_DE_CONFIRMACAO} value={VALOR_CONFIRMADO} hidden tabIndex={-1} />
      <AlertDialog.Root>
        <AlertDialog.Trigger asChild disabled={pending}>
          {children}
        </AlertDialog.Trigger>
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="fixed inset-0 z-[60] bg-black/60" />
          <AlertDialog.Content className="fixed top-1/2 left-1/2 z-[60] grid max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 gap-4 overflow-y-auto rounded-lg border bg-popover p-5 text-popover-foreground shadow-xl">
            <AlertDialog.Title className="text-lg font-semibold tracking-tight break-words">{titulo}</AlertDialog.Title>
            <AlertDialog.Description className="text-sm break-words text-muted-foreground">{descricao}</AlertDialog.Description>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <AlertDialog.Cancel asChild>
                <Button type="button" variant="outline" className="h-11 md:h-9">
                  Cancelar
                </Button>
              </AlertDialog.Cancel>
              <AlertDialog.Action asChild>
                {/* Envia pelo botão que fica no formulário, e o diálogo se fecha. */}
                <Button
                  type="button"
                  variant="destructive"
                  className="h-11 md:h-9"
                  onClick={() => envio.current?.form?.requestSubmit(envio.current)}
                >
                  {confirmar}
                </Button>
              </AlertDialog.Action>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
      <noscript>
        <p className="text-sm">Para apagar, ative o JavaScript do navegador.</p>
      </noscript>
    </>
  );
}

// Recebe do diálogo o clique, o foco e os atributos de acessibilidade.
function BotaoDeExclusao({ rotulo, ...props }: { rotulo: string } & ComponentProps<typeof Button>) {
  const { pending } = useFormStatus();
  return (
    <Button {...props} type="button" variant="destructive" aria-busy={pending} className="sm:justify-self-start sm:px-5">
      {pending ? "Excluindo…" : rotulo}
    </Button>
  );
}

/** Formulário de um botão só para excluir um registro, com confirmação e mensagem de erro. */
export function FormularioDeExclusao({
  acao, pergunta, rotulo,
}: {
  acao: (anterior: EstadoDoFormulario, formulario: FormData) => Promise<EstadoDoFormulario>;
  pergunta: string;
  rotulo: string;
}) {
  const [estado, enviar] = useActionState(acao, {});
  return (
    <form action={enviar} className="grid gap-3">
      <MensagemDoFormulario estado={estado} />
      <ConfirmacaoDoEnvio titulo={`${rotulo}?`} descricao={pergunta} confirmar={rotulo}>
        <BotaoDeExclusao rotulo={rotulo} />
      </ConfirmacaoDoEnvio>
    </form>
  );
}
