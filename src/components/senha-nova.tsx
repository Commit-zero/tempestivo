"use client";

import { useEffect, useId, useRef, useState } from "react";
import { cn } from "cn";
import { Campo } from "@/components/formulario";
import { avaliarSenha, TAMANHO_MAXIMO_DA_SENHA, TAMANHO_MINIMO_DA_SENHA } from "@/lib/regras-de-senha";

/**
 * Senha nova e confirmação, com as regras marcadas enquanto a pessoa digita. A
 * marcação só ajuda: quem aceita ou recusa a senha é o servidor.
 * Sem `email` (redefinição pelo link), a regra do nome do e-mail só é conferida ao salvar.
 */
export function CamposDeSenhaNova({ rotulo = "Senha", rotuloDaConfirmacao = "Confirme a senha", email }: {
  rotulo?: string;
  rotuloDaConfirmacao?: string;
  email?: string;
}) {
  const idDasRegras = useId();
  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const grupo = useRef<HTMLDivElement>(null);

  // O React limpa o formulário depois de cada envio; a marcação acompanha.
  useEffect(() => {
    const formulario = grupo.current?.closest("form");
    const limpar = () => {
      setSenha("");
      setConfirmacao("");
    };
    formulario?.addEventListener("reset", limpar);
    return () => formulario?.removeEventListener("reset", limpar);
  }, []);

  return (
    <div ref={grupo} className="grid gap-4">
      <div className="grid gap-1.5">
        <Campo
          rotulo={rotulo}
          name="senha"
          type="password"
          autoComplete="new-password"
          required
          minLength={TAMANHO_MINIMO_DA_SENHA}
          maxLength={TAMANHO_MAXIMO_DA_SENHA}
          aria-describedby={idDasRegras}
          onChange={(evento) => setSenha(evento.target.value)}
        />
        <ul id={idDasRegras} aria-label="Regras da senha" className="grid gap-0.5 text-sm text-muted-foreground">
          {avaliarSenha(senha, email).map((regra) => {
            const aoSalvar = regra.id === "email" && email === undefined;
            const atendida = senha.length > 0 && regra.atendida && !aoSalvar;
            return (
              <li key={regra.id} className={cn("flex gap-2", atendida && "text-positivo")}>
                <span aria-hidden="true">{atendida ? "✓" : "•"}</span>
                <span>
                  {regra.descricao}
                  {aoSalvar ? " (conferida ao salvar)" : <span className="sr-only">{atendida ? ": atendida" : ": pendente"}</span>}
                </span>
              </li>
            );
          })}
        </ul>
        <p className="text-sm text-muted-foreground">Uma frase longa é melhor que símbolos difíceis.</p>
      </div>
      <Campo
        rotulo={rotuloDaConfirmacao}
        name="confirmacao"
        type="password"
        autoComplete="new-password"
        required
        maxLength={TAMANHO_MAXIMO_DA_SENHA}
        onChange={(evento) => setConfirmacao(evento.target.value)}
        dica={confirmacao.length === 0 ? undefined : confirmacao === senha ? "As senhas conferem." : "As senhas ainda não conferem."}
      />
    </div>
  );
}
