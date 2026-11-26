"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { BotaoEnviar, Campo, CampoDeMarcar, MensagemDoFormulario } from "@/components/formulario";
import { CamposDeSenhaNova } from "@/components/senha-nova";
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

export function FormularioDeCadastro() {
  const [estado, acao] = useActionState(acaoCadastrar, inicial);
  // Só para a regra "sem o nome do seu e-mail"; o campo continua livre.
  const [email, setEmail] = useState("");
  return (
    <form action={acao} className="grid gap-4">
      <MensagemDoFormulario estado={estado} />
      <Campo rotulo="Nome" name="nome" autoComplete="name" required minLength={2} maxLength={120} defaultValue={estado.valores?.nome} />
      <Campo
        rotulo="E-mail"
        name="email"
        type="email"
        autoComplete="email"
        inputMode="email"
        required
        defaultValue={estado.valores?.email}
        onChange={(evento) => setEmail(evento.target.value)}
      />
      <CamposDeSenhaNova email={email || estado.valores?.email || ""} />
      <CampoDeMarcar
        name="aceite"
        required
        rotulo="Li e entendi"
        dica={
          <>
            Aceito os{" "}
            <Link href="/termos" target="_blank" className="text-primary underline underline-offset-4">
              Termos de uso
            </Link>{" "}
            e a{" "}
            <Link href="/privacidade" target="_blank" className="text-primary underline underline-offset-4">
              Política de privacidade
            </Link>
            . O cálculo de prazo é auxiliar e deve ser conferido por mim. Nesta fase de testes, vou cadastrar apenas dados fictícios.
          </>
        }
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

export function FormularioDeNovaSenha({ token }: { token: string }) {
  const [estado, acao] = useActionState(acaoRedefinirSenha, inicial);
  return (
    <form action={acao} className="grid gap-4">
      <MensagemDoFormulario estado={estado} />
      <input type="hidden" name="token" value={token} />
      <CamposDeSenhaNova rotulo="Nova senha" rotuloDaConfirmacao="Confirme a nova senha" />
      <BotaoEnviar enviando="Salvando…">Salvar nova senha</BotaoEnviar>
    </form>
  );
}
