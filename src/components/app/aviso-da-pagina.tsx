"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { Aviso } from "@/components/app/aviso";
import { COOKIE_DO_AVISO } from "@/lib/avisos";

type Mensagem = { id: string; texto: string };

/**
 * O resultado da última ação, no pé da tela: aparece onde quer que a pessoa esteja
 * rolando, sem mover o foco. É `sticky`, e não `fixed`: no fim da página ele ocupa o
 * próprio espaço, então nunca deixa um botão sem como ser alcançado. Não some sozinho:
 * sai ao fechar, na próxima ação ou ao mudar de tela.
 */
export function AvisoDaPagina({ mensagem }: { mensagem: Mensagem | null }) {
  const caminho = usePathname();
  const [atual, setAtual] = useState<(Mensagem & { caminho: string; fechado: boolean }) | null>(null);

  // Ajuste de estado durante a renderização, como recomenda o React.
  if (mensagem && mensagem.id !== atual?.id) setAtual({ ...mensagem, caminho, fechado: false });
  else if (atual && !atual.fechado && atual.caminho !== caminho) setAtual({ ...atual, fechado: true });

  useEffect(() => {
    if (mensagem) document.cookie = `${COOKIE_DO_AVISO}=; path=/; max-age=0`;
  }, [mensagem]);

  // Todo envio novo fecha o aviso anterior: se a ação seguinte falhar ou não avisar, o
  // sucesso antigo não pode parecer a resposta dela.
  useEffect(() => {
    const fechar = () => setAtual((anterior) => (anterior && !anterior.fechado ? { ...anterior, fechado: true } : anterior));
    document.addEventListener("submit", fechar, true);
    return () => document.removeEventListener("submit", fechar, true);
  }, []);

  const visivel = atual && !atual.fechado && atual.caminho === caminho ? atual : null;
  return (
    // A região existe sempre: o leitor de tela só anuncia o que entra numa região já presente.
    <div
      role="status"
      data-aviso-da-pagina
      className="pointer-events-none sticky bottom-[calc(4.25rem+env(safe-area-inset-bottom))] z-30 flex justify-center px-4 not-empty:py-2 md:bottom-2"
    >
      {visivel ? (
        // A chave faz da mesma mensagem, repetida, um elemento novo: ela é anunciada de novo.
        <Aviso key={visivel.id} tipo="sucesso" como="div" semAnuncio className="pointer-events-auto flex w-full max-w-md items-center gap-3 border-y border-r shadow-lg">
          <span className="flex-1">{visivel.texto}</span>
          <button
            type="button"
            onClick={() => {
              setAtual({ ...visivel, fechado: true });
              // O botão some: o foco vai para o conteúdo, sem rolar a tela.
              document.getElementById("conteudo")?.focus({ preventScroll: true });
            }}
            className="-my-1 -mr-1 flex size-11 shrink-0 items-center justify-center rounded-md md:size-9"
          >
            <X className="size-4" aria-hidden="true" />
            <span className="sr-only">Fechar o aviso</span>
          </button>
        </Aviso>
      ) : null}
    </div>
  );
}
