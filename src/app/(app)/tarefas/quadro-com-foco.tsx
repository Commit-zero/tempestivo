"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

// Ao mover uma tarefa, o cartão é recriado em outra coluna e o foco do teclado se
// perderia. Este invólucro lembra qual tarefa foi movida, devolve o foco ao cartão
// dela quando o quadro atualiza e anuncia a nova coluna para o leitor de tela.
export function QuadroComFoco({ assinatura, children }: { assinatura: string; children: ReactNode }) {
  const movida = useRef<string | null>(null);
  const [aviso, setAviso] = useState("");

  useEffect(() => {
    const id = movida.current;
    if (!id) return;
    movida.current = null;
    const cartao = document.querySelector<HTMLElement>(`[data-tarefa="${CSS.escape(id)}"]`);
    if (!cartao) return;
    cartao.focus();
    setAviso(`Tarefa movida para ${cartao.dataset.coluna}.`);
  }, [assinatura]);

  return (
    <div
      className="grid gap-4 md:grid-cols-3"
      onSubmitCapture={(evento) => {
        const id = (evento.target as HTMLElement).dataset.moverTarefa;
        if (id) movida.current = id;
      }}
    >
      {children}
      <p role="status" className="sr-only">
        {aviso}
      </p>
    </div>
  );
}
