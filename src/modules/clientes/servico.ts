import { z } from "zod";
import { documentoValido, soDigitos } from "@/lib/documento";
import { falha, primeiraMensagem, sucesso, type Resultado } from "@/lib/resultado";
import { textoOpcional } from "@/lib/validacao";
import * as repositorio from "./repositorio";
import type { Cliente, ClienteComContagem } from "./repositorio";

const schemaCliente = z.object({
  nome: z.string().trim().min(2, "Informe o nome do cliente.").max(160, "Use no máximo 160 caracteres no nome."),
  documento: textoOpcional(18)
    .refine((valor) => valor === null || documentoValido(valor), "CPF ou CNPJ inválido.")
    .transform((valor) => (valor === null ? null : soDigitos(valor))),
  email: textoOpcional(254).refine((valor) => valor === null || z.email().safeParse(valor).success, "E-mail inválido."),
  telefone: textoOpcional(20)
    .transform((valor) => (valor === null ? null : soDigitos(valor)))
    .refine((valor) => valor === null || (valor.length >= 10 && valor.length <= 13), "Telefone inválido. Informe com DDD."),
  observacoes: textoOpcional(2000),
});

export type EntradaDeCliente = Record<keyof z.input<typeof schemaCliente>, unknown>;

const NAO_ENCONTRADO = "Cliente não encontrado.";

export function listarClientes(contaId: string, busca?: string): Promise<ClienteComContagem[]> {
  return repositorio.listar(contaId, busca?.trim() || undefined);
}

export function obterCliente(contaId: string, id: string): Promise<Cliente | null> {
  return repositorio.buscar(contaId, id);
}

export async function criarCliente(contaId: string, entrada: EntradaDeCliente): Promise<Resultado<Cliente>> {
  const validado = schemaCliente.safeParse(entrada);
  if (!validado.success) return falha(primeiraMensagem(validado.error));
  return sucesso(await repositorio.criar(contaId, validado.data));
}

export async function atualizarCliente(contaId: string, id: string, entrada: EntradaDeCliente): Promise<Resultado> {
  const validado = schemaCliente.safeParse(entrada);
  if (!validado.success) return falha(primeiraMensagem(validado.error));
  return (await repositorio.atualizar(contaId, id, validado.data)) ? sucesso() : falha(NAO_ENCONTRADO);
}

export async function excluirCliente(contaId: string, id: string): Promise<Resultado> {
  if ((await repositorio.contarVinculos(contaId, id)) > 0) {
    return falha("Este cliente tem processos ou honorários. Exclua-os antes de excluir o cliente.");
  }
  return (await repositorio.excluir(contaId, id)) ? sucesso() : falha(NAO_ENCONTRADO);
}
