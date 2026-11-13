"use client";

import { useActionState, useState } from "react";
import { BotaoEnviar, Campo, CampoDeEscolha, MensagemDoFormulario } from "@/components/formulario";
import type { EstadoDoFormulario } from "@/lib/formulario";

type Acao = (anterior: EstadoDoFormulario, formulario: FormData) => Promise<EstadoDoFormulario>;

export function FormularioDeHonorario({
  acao, clientes, processos, inicial,
}: {
  acao: Acao;
  clientes: { id: string; nome: string }[];
  processos: { id: string; clienteId: string; assunto: string }[];
  inicial: Record<string, string>;
}) {
  const [estado, enviar] = useActionState(acao, { valores: inicial });
  const valores = estado.valores ?? {};
  const [clienteId, setClienteId] = useState(valores.clienteId ?? "");
  const doCliente = processos.filter((processo) => processo.clienteId === clienteId);
  return (
    <form action={enviar} className="grid gap-4">
      <MensagemDoFormulario estado={estado} />
      <CampoDeEscolha rotulo="Cliente" name="clienteId" required value={clienteId} onChange={(evento) => setClienteId(evento.target.value)}>
        <option value="" disabled>
          Escolha o cliente
        </option>
        {clientes.map((cliente) => (
          <option key={cliente.id} value={cliente.id}>
            {cliente.nome}
          </option>
        ))}
      </CampoDeEscolha>
      <CampoDeEscolha rotulo="Processo" name="processoId" defaultValue={valores.processoId ?? ""} key={clienteId} dica="Opcional. Só aparecem os processos do cliente escolhido.">
        <option value="">Sem processo vinculado</option>
        {doCliente.map((processo) => (
          <option key={processo.id} value={processo.id}>
            {processo.assunto}
          </option>
        ))}
      </CampoDeEscolha>
      <Campo rotulo="Descrição" name="descricao" required minLength={2} maxLength={160} autoComplete="off" defaultValue={valores.descricao} />
      <div className="grid gap-4 sm:grid-cols-3">
        <Campo rotulo="Valor total (R$)" name="valorTotal" required inputMode="decimal" autoComplete="off" placeholder="1.500,00" defaultValue={valores.valorTotal} />
        <Campo rotulo="Parcelas" name="parcelas" type="number" inputMode="numeric" required min={1} max={60} defaultValue={valores.parcelas} />
        <Campo rotulo="Primeiro vencimento" name="primeiroVencimento" type="date" required defaultValue={valores.primeiroVencimento} />
      </div>
      <p className="text-sm text-muted-foreground">As parcelas vencem no mesmo dia de cada mês. Os centavos que sobram da divisão entram na primeira.</p>
      <BotaoEnviar enviando="Salvando…" className="sm:justify-self-start sm:px-5">
        Cadastrar honorário
      </BotaoEnviar>
    </form>
  );
}
