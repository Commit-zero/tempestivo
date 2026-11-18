// Enquanto uma tela da área logada carrega: esqueleto com o formato da página e
// anúncio para leitor de tela, sem deslocar o layout quando o conteúdo chega.
export default function Carregando() {
  return (
    <div className="grid gap-6" aria-busy="true" data-carregando>
      <p role="status" className="sr-only">
        Carregando…
      </p>
      <div className="h-8 w-48 animate-pulse rounded-lg bg-muted" />
      <div className="grid gap-3">
        {[0, 1, 2].map((linha) => (
          <div key={linha} className="h-20 animate-pulse rounded-xl bg-muted" />
        ))}
      </div>
    </div>
  );
}
