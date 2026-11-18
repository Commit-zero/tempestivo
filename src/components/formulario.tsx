"use client";

import { useEffect, useId, useRef, type ComponentProps, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { EstadoDoFormulario } from "@/lib/formulario";

// Alvo de toque de 44 px no celular; mais compacto a partir do tablet.
const alturaDeToque = "h-11 md:h-9";
const classeDoControle =
  "w-full min-w-0 rounded-lg border border-input bg-card px-2.5 text-base outline-none transition-colors " +
  "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring disabled:opacity-50 md:text-sm";

type PropsDoCampo = { rotulo: string; dica?: ReactNode; className?: string };

function Moldura({ id, rotulo, dica, className, children }: PropsDoCampo & { id: string; children: ReactNode }) {
  return (
    <div className={cn("grid gap-1.5", className)}>
      <Label htmlFor={id}>{rotulo}</Label>
      {children}
      {dica ? (
        <p id={`${id}-dica`} className="text-sm text-muted-foreground">
          {dica}
        </p>
      ) : null}
    </div>
  );
}

export function Campo({ rotulo, dica, className, ...props }: PropsDoCampo & Omit<ComponentProps<"input">, "className">) {
  const id = useId();
  return (
    <Moldura id={id} rotulo={rotulo} dica={dica} className={className}>
      <Input id={id} aria-describedby={dica ? `${id}-dica` : undefined} className={cn(alturaDeToque, "bg-card")} {...props} />
    </Moldura>
  );
}

export function CampoDeTexto({ rotulo, dica, className, ...props }: PropsDoCampo & Omit<ComponentProps<"textarea">, "className">) {
  const id = useId();
  return (
    <Moldura id={id} rotulo={rotulo} dica={dica} className={className}>
      <Textarea id={id} aria-describedby={dica ? `${id}-dica` : undefined} className="min-h-24 bg-card text-base md:text-sm" {...props} />
    </Moldura>
  );
}

export function CampoDeEscolha({ rotulo, dica, className, children, ...props }: PropsDoCampo & Omit<ComponentProps<"select">, "className">) {
  const id = useId();
  return (
    <Moldura id={id} rotulo={rotulo} dica={dica} className={className}>
      <select id={id} aria-describedby={dica ? `${id}-dica` : undefined} className={cn(classeDoControle, alturaDeToque)} {...props}>
        {children}
      </select>
    </Moldura>
  );
}

export function CampoDeMarcar({ rotulo, dica, ...props }: { rotulo: string; dica?: ReactNode } & Omit<ComponentProps<"input">, "type">) {
  const id = useId();
  return (
    <div className="flex min-h-11 items-start gap-3 py-2">
      <input id={id} type="checkbox" className="mt-0.5 size-5 shrink-0 accent-primary" {...props} />
      <div className="grid gap-0.5">
        <Label htmlFor={id}>{rotulo}</Label>
        {dica ? <p className="text-sm text-muted-foreground">{dica}</p> : null}
      </div>
    </div>
  );
}

export function BotaoEnviar({ children, enviando = "Enviando…", ...props }: ComponentProps<typeof Button> & { enviando?: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} aria-busy={pending} {...props}>
      {pending ? enviando : children}
    </Button>
  );
}

export function MensagemDoFormulario({ estado }: { estado: EstadoDoFormulario }) {
  // O erro vem do servidor depois do envio, no topo do formulário: no celular ele
  // ficaria fora da tela. Leva a tela e o foco até ele, para quem enxerga e para o
  // leitor de tela. Cada envio devolve um estado novo, então o efeito roda a cada erro.
  const alerta = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (!estado.erro || !alerta.current) return;
    alerta.current.focus({ preventScroll: true });
    alerta.current.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [estado]);
  if (estado.erro) {
    return (
      <p ref={alerta} role="alert" tabIndex={-1} className="rounded-lg border border-destructive/30 bg-perigo-fundo px-3 py-2 text-sm text-destructive">
        {estado.erro}
      </p>
    );
  }
  if (estado.aviso) {
    return (
      <p role="status" className="rounded-lg border border-positivo/30 bg-positivo-fundo px-3 py-2 text-sm text-positivo">
        {estado.aviso}
      </p>
    );
  }
  return null;
}
