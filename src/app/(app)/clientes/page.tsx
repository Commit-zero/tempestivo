import type { Metadata } from "next";
import Link from "next/link";
import { Busca } from "@/components/app/busca";
import { CabecalhoDaPagina, EstadoVazio, ItemDeLink, ListaDeLinks } from "@/components/app/pagina";
import { Button } from "@/components/ui/button";
import { listarClientes } from "@/modules/clientes";
import { exigirSessao } from "@/platform/auth";

export const metadata: Metadata = { title: "Clientes" };

export default async function PaginaDeClientes({ searchParams }: PageProps<"/clientes">) {
  const { contaId } = await exigirSessao();
  const { busca } = await searchParams;
  const termo = typeof busca === "string" ? busca : undefined;
  const clientes = await listarClientes(contaId, termo);
  const novo = (
    <Button asChild>
      <Link href="/clientes/novo">Novo cliente</Link>
    </Button>
  );
  return (
    <div className="grid gap-6">
      <CabecalhoDaPagina titulo="Clientes" acao={novo} />
      <Busca rotulo="Buscar por nome" valor={termo} />
      {clientes.length === 0 ? (
        <EstadoVazio
          titulo={termo ? "Nenhum cliente com esse nome." : "Nenhum cliente cadastrado."}
          descricao={termo ? undefined : "Cadastre o primeiro cliente para depois abrir os processos dele."}
          acao={termo ? undefined : novo}
        />
      ) : (
        <ListaDeLinks>
          {clientes.map((cliente) => (
            <ItemDeLink key={cliente.id} href={`/clientes/${cliente.id}`}>
              <span className="min-w-0 flex-1 font-medium break-words">{cliente.nome}</span>
              <span className="shrink-0 text-sm text-muted-foreground">
                {cliente.processos === 1 ? "1 processo" : `${cliente.processos} processos`}
              </span>
            </ItemDeLink>
          ))}
        </ListaDeLinks>
      )}
    </div>
  );
}
