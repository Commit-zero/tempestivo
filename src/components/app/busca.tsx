import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";

// Busca por formulário GET: funciona sem JavaScript e deixa o termo na URL.
export function Busca({ rotulo, valor, children }: { rotulo: string; valor?: string; children?: React.ReactNode }) {
  return (
    <form role="search" className="flex flex-wrap gap-2">
      {children}
      <label className="sr-only" htmlFor="busca">
        {rotulo}
      </label>
      <input
        id="busca"
        name="busca"
        type="search"
        defaultValue={valor}
        placeholder={rotulo}
        className="h-11 min-w-0 flex-1 rounded-lg border border-input bg-card px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:h-9 md:text-sm"
      />
      <Button type="submit" variant="outline" aria-label="Buscar" className="w-11 md:w-9">
        <Search aria-hidden="true" />
      </Button>
    </form>
  );
}
