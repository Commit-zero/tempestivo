"use client";

import { useActionState } from "react";
import { BotaoEnviar, Campo, CampoDeEscolha, MensagemDoFormulario } from "@/components/formulario";
import type { EstadoDoFormulario } from "@/lib/formulario";

type Acao = (anterior: EstadoDoFormulario, formulario: FormData) => Promise<EstadoDoFormulario>;

export function FormularioDeProcesso({
  acao, clientes, tribunais, inicial, rotuloDoBotao,
}: {
  acao: Acao;
  clientes: { id: string; nome: string }[];
  tribunais: { sigla: string; nome: string }[];
  inicial?: Record<string, string>;
  rotuloDoBotao: string;
}) {
  const [estado, enviar] = useActionState(acao, { valores: inicial });
  const valores = estado.valores ?? {};
  return (
    <form action={enviar} className="grid gap-4">
      <MensagemDoFormulario estado={estado} />
      <CampoDeEscolha rotulo="Cliente" name="clienteId" required defaultValue={valores.clienteId ?? ""} key={valores.clienteId}>
        <option value="" disabled>
          Escolha o cliente
        </option>
        {clientes.map((cliente) => (
          <option key={cliente.id} value={cliente.id}>
            {cliente.nome}
          </option>
        ))}
      </CampoDeEscolha>
      <Campo
        rotulo="Número do processo"
        name="numero"
        required
        inputMode="numeric"
        maxLength={25}
        autoComplete="off"
        placeholder="0000000-00.0000.0.00.0000"
        defaultValue={valores.numero}
        dica="Os 20 dígitos da numeração do CNJ, com ou sem pontuação."
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo
          rotulo="Tribunal"
          name="tribunal"
          required
          maxLength={20}
          autoComplete="off"
          list="tribunais"
          defaultValue={valores.tribunal}
          dica={`A calculadora de prazos atende ${tribunais.map((tribunal) => tribunal.sigla).join(" e ")}. Nos demais, a data final é digitada.`}
        />
        <datalist id="tribunais">
          {tribunais.map((tribunal) => (
            <option key={tribunal.sigla} value={tribunal.sigla}>
              {tribunal.nome}
            </option>
          ))}
        </datalist>
        <Campo rotulo="Vara" name="vara" maxLength={120} autoComplete="off" defaultValue={valores.vara} dica="Opcional." />
      </div>
      <Campo rotulo="Assunto" name="assunto" required minLength={2} maxLength={200} autoComplete="off" defaultValue={valores.assunto} />
      <Campo rotulo="Parte contrária" name="parteContraria" maxLength={160} autoComplete="off" defaultValue={valores.parteContraria} dica="Opcional." />
      <BotaoEnviar enviando="Salvando…" className="sm:justify-self-start sm:px-5">
        {rotuloDoBotao}
      </BotaoEnviar>
    </form>
  );
}
