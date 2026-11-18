"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

// Erro inesperado numa tela da área logada. Mostra o que fazer, nunca o detalhe técnico
// (que pode ter dados): o `digest` serve para achar o erro no log do servidor.
export default function ErroDaTela({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div role="alert" className="grid max-w-md gap-4">
      <h1 className="text-2xl font-semibold tracking-tight">Algo deu errado</h1>
      <p className="text-muted-foreground">
        Não foi possível mostrar esta tela agora. Nenhum dado foi perdido. Tente de novo; se continuar, volte ao painel.
      </p>
      {error.digest ? <p className="text-sm text-muted-foreground">Código para o suporte: {error.digest}</p> : null}
      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={reset}>
          Tentar de novo
        </Button>
        <Button asChild variant="outline">
          <Link href="/painel">Ir para o painel</Link>
        </Button>
      </div>
    </div>
  );
}
