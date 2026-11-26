import { cn } from "cn";

/**
 * Símbolo do Tempestivo: um cronômetro cujos ponteiros formam o sinal de conferido.
 * "Tempestivo" é o que chega no tempo certo; o produto promete o prazo conferido a tempo.
 * As cores são as da marca (iguais em `src/app/icon.svg`), não os tokens do tema:
 * o símbolo não muda no tema escuro.
 */
export function Simbolo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" className={cn("size-7 shrink-0 rounded-[23%] dark:ring-1 dark:ring-white/20", className)}>
      <rect width="64" height="64" rx="15" fill="#123260" />
      <rect x="27" y="7" width="10" height="6" rx="2" fill="#fbfaf7" />
      <circle cx="32" cy="36" r="19" fill="none" stroke="#fbfaf7" strokeWidth="4.5" />
      <path d="M23.5 36.5l6 6 11.5-13" fill="none" stroke="#eba941" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
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
