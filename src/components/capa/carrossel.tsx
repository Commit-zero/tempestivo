"use client";

import { Children, useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Carrossel sem dependência (padrão do WAI-ARIA). Não roda sozinho. A base é uma faixa
 * com rolagem e `scroll-snap`, que funciona sem JavaScript; com ele entram os botões e
 * a posição.
 */
export function Carrossel({ rotulo, nomes, children }: { rotulo: string; nomes: readonly string[]; children: ReactNode }) {
  const trilho = useRef<HTMLDivElement>(null);
  // Tela para onde um botão ou seta mandou rolar. Até chegar lá, os eventos de rolagem
  // do meio do caminho não mudam a posição (o primeiro deles ainda aponta a anterior).
  const destinoDaRolagem = useRef<number | null>(null);
  const prazoDoDestino = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [atual, setAtual] = useState(0);
  const [comBotoes, setComBotoes] = useState(false);
  const total = nomes.length;

  // Os botões só aparecem quando o JavaScript está rodando.
  useEffect(() => {
    const quadro = requestAnimationFrame(() => setComBotoes(true));
    return () => {
      cancelAnimationFrame(quadro);
      clearTimeout(prazoDoDestino.current);
    };
  }, []);

  function irPara(indice: number) {
    const destino = Math.max(0, Math.min(total - 1, indice));
    // Na ponta não há o que rolar: guardar o destino travaria a posição.
    if (destino === atual) return;
    destinoDaRolagem.current = destino;
    // Se a rolagem for interrompida por outro meio, a posição volta a seguir a tela.
    clearTimeout(prazoDoDestino.current);
    prazoDoDestino.current = setTimeout(() => {
      aoRolarAMao();
      aoRolar();
    }, 1_200);
    setAtual(destino);
    const faixa = trilho.current;
    // A rolagem suave é desligada pelo CSS para quem pede menos movimento.
    faixa?.scrollTo({ left: destino * faixa.clientWidth });
  }

  function aoRolar() {
    const faixa = trilho.current;
    if (!faixa) return;
    const posicao = faixa.scrollLeft / faixa.clientWidth;
    // Só quando a rolagem para numa tela; no meio do caminho a posição não muda.
    if (Math.abs(posicao - Math.round(posicao)) >= 0.02) return;
    if (destinoDaRolagem.current !== null && Math.round(posicao) !== destinoDaRolagem.current) return;
    destinoDaRolagem.current = null;
    setAtual(Math.round(posicao));
  }

  // Quem rola com o dedo ou o mouse retoma o controle da posição.
  function aoRolarAMao() {
    destinoDaRolagem.current = null;
  }

  function aoTeclar(evento: KeyboardEvent) {
    if (evento.altKey || evento.ctrlKey || evento.metaKey) return; // atalhos do navegador
    if (evento.key !== "ArrowLeft" && evento.key !== "ArrowRight") return;
    evento.preventDefault();
    irPara(atual + (evento.key === "ArrowRight" ? 1 : -1));
  }

  return (
    <section aria-roledescription="carrossel" aria-label={rotulo} className="grid min-w-0 gap-4">
      <div
        ref={trilho}
        data-testid="trilho-do-carrossel"
        role="group"
        aria-label="Telas, use as setas para trocar"
        tabIndex={0}
        onScroll={aoRolar}
        onKeyDown={aoTeclar}
        onPointerDown={aoRolarAMao}
        onWheel={aoRolarAMao}
        className="flex snap-x snap-mandatory overflow-x-auto scroll-smooth rounded-md border bg-muted"
      >
        {Children.map(children, (tela, indice) => (
          <div
            role="group"
            aria-roledescription="tela"
            aria-label={`${indice + 1} de ${total}: ${nomes[indice]}`}
            className="w-full min-w-0 shrink-0 snap-center p-4 sm:p-8"
          >
            {tela}
          </div>
        ))}
      </div>
      {comBotoes ? (
        <div className="flex items-center justify-between gap-3">
          {/* `aria-disabled` mantém o foco no botão quando se chega à ponta. */}
          <Button
            type="button"
            variant="outline"
            className="size-11 aria-disabled:opacity-40 md:size-11"
            aria-disabled={atual === 0}
            onClick={() => irPara(atual - 1)}
          >
            <ChevronLeft aria-hidden="true" />
            <span className="sr-only">Tela anterior</span>
          </Button>
          <p data-testid="posicao-do-carrossel" aria-live="polite" className="text-center text-sm text-muted-foreground">
            {atual + 1} de {total}: {nomes[atual]}
          </p>
          <Button
            type="button"
            variant="outline"
            className="size-11 aria-disabled:opacity-40 md:size-11"
            aria-disabled={atual === total - 1}
            onClick={() => irPara(atual + 1)}
          >
            <ChevronRight aria-hidden="true" />
            <span className="sr-only">Próxima tela</span>
          </Button>
        </div>
      ) : (
        <p className="text-center text-sm text-muted-foreground">Role para o lado para ver as {total} telas.</p>
      )}
    </section>
  );
}
