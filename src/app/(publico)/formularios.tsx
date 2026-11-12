"use client";

import { useActionState } from "react";
import { BotaoEnviar, Campo, CampoDeMarcar, MensagemDoFormulario } from "@/components/formulario";
import type { EstadoDoFormulario } from "@/lib/formulario";
import { acaoCadastrar, acaoEntrar, acaoPedirRedefinicao, acaoRedefinirSenha } from "./acoes";

const inicial: EstadoDoFormulario = {};

export function FormularioDeEntrada() {
  const [estado, acao] = useActionState(acaoEntrar, inicial);
  return (
    <form action={acao} className="grid gap-4">
      <MensagemDoFormulario estado={estado} />
      <Campo rotulo="E-mail" name="email" type="email" autoComplete="email" inputMode="email" required defaultValue={estado.valores?.email} />
      <Campo rotulo="Senha" name="senha" type="password" autoComplete="current-password" required />
      <BotaoEnviar enviando="Entrando…">Entrar</BotaoEnviar>
    </form>
  );
}

export function FormularioDeCadastro({ tamanhoMinimoDaSenha }: { tamanhoMinimoDaSenha: number }) {
  const [estado, acao] = useActionState(acaoCadastrar, inicial);
  return (
    <form action={acao} className="grid gap-4">
      <MensagemDoFormulario estado={estado} />
      <Campo rotulo="Nome" name="nome" autoComplete="name" required minLength={2} maxLength={120} defaultValue={estado.valores?.nome} />
      <Campo rotulo="E-mail" name="email" type="email" autoComplete="email" inputMode="email" required defaultValue={estado.valores?.email} />
      <Campo
        rotulo="Senha"
        name="senha"
        type="password"
        autoComplete="new-password"
        required
        minLength={tamanhoMinimoDaSenha}
        maxLength={128}
        dica={`Pelo menos ${tamanhoMinimoDaSenha} caracteres. Uma frase longa é melhor que símbolos difíceis.`}
      />
      <CampoDeMarcar
        name="aceite"
        required
        rotulo="Li e entendi"
        dica="O cálculo de prazo é auxiliar e deve ser conferido por mim. Nesta fase de testes, vou cadastrar apenas dados fictícios."
      />
      <BotaoEnviar enviando="Criando a conta…">Criar conta</BotaoEnviar>
    </form>
  );
}

export function FormularioDePedidoDeRedefinicao() {
  const [estado, acao] = useActionState(acaoPedirRedefinicao, inicial);
  return (
    <form action={acao} className="grid gap-4">
      <MensagemDoFormulario estado={estado} />
      <Campo rotulo="E-mail" name="email" type="email" autoComplete="email" inputMode="email" required />
      <BotaoEnviar>Enviar link</BotaoEnviar>
    </form>
  );
}

export function FormularioDeNovaSenha({ token, tamanhoMinimoDaSenha }: { token: string; tamanhoMinimoDaSenha: number }) {
  const [estado, acao] = useActionState(acaoRedefinirSenha, inicial);
  return (
    <form action={acao} className="grid gap-4">
      <MensagemDoFormulario estado={estado} />
      <input type="hidden" name="token" value={token} />
      <Campo
        rotulo="Nova senha"
        name="senha"
        type="password"
        autoComplete="new-password"
        required
        minLength={tamanhoMinimoDaSenha}
        maxLength={128}
        dica={`Pelo menos ${tamanhoMinimoDaSenha} caracteres.`}
      />
      <BotaoEnviar enviando="Salvando…">Salvar nova senha</BotaoEnviar>
    </form>
  );
}
