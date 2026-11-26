import { cn } from "cn";

/**
 * Símbolo do Tempestivo: quatro dias de uma contagem. Dois contados, um sem expediente
 * (vazado) e o último, maior, conferido. Não usa letra nem o nome, que é provisório.
 * As cores são as da marca (iguais em `src/app/icon.svg`), não os tokens do tema: o
 * símbolo não muda no tema escuro. `src/test/marca.test.ts` confere as formas.
 */
export function Simbolo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" className={cn("size-7 shrink-0 rounded-[22%] dark:ring-1 dark:ring-white/20", className)}>
      <rect width="64" height="64" rx="14" fill="#4136A8" />
      <rect x="11" y="11" width="19" height="19" rx="4" fill="#B3AEFF" />
      <rect x="34" y="11" width="19" height="19" rx="4" fill="#B3AEFF" />
      <rect x="12.5" y="35.5" width="16" height="16" rx="3" fill="none" stroke="#B3AEFF" strokeWidth="3" />
      <rect x="34" y="34" width="22" height="22" rx="5" fill="#FFFFFF" />
      <path d="M39 45.5l4.5 4.5 8-9.5" fill="none" stroke="#4136A8" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Marca({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5 text-xl font-bold tracking-tight text-foreground [font-stretch:112%]", className)}>
      <Simbolo />
      Tempestivo
    </span>
  );
}
