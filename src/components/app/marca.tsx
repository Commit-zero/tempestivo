import { cn } from "cn";

// Marca do produto: um relógio com o ponteiro "em tempo" e o nome.
export function Marca({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2 text-lg font-semibold tracking-tight text-primary", className)}>
      <svg viewBox="0 0 24 24" aria-hidden="true" className="size-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3.5 2" />
      </svg>
      Tempestivo
    </span>
  );
}
