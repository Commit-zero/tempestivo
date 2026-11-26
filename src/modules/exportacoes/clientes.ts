import { formatarDocumento } from "@/lib/documento";
import { celula, type Aba } from "@/lib/planilha";
import { listarClientes } from "@/modules/clientes";

export async function abasDeClientes(contaId: string, { busca }: { busca?: string }): Promise<Aba[]> {
  const clientes = await listarClientes(contaId, busca);
  return [
    {
      nome: "Clientes",
      colunas: [
        { titulo: "Nome", largura: 36 }, { titulo: "CPF ou CNPJ", largura: 20 }, { titulo: "E-mail", largura: 32 },
        { titulo: "Telefone", largura: 18 }, { titulo: "Observações", largura: 50 }, { titulo: "Processos", largura: 11 },
        { titulo: "Cadastrado em", largura: 15 },
      ],
      linhas: clientes.map((cliente) => [
        celula.texto(cliente.nome),
        celula.texto(cliente.documento ? formatarDocumento(cliente.documento) : null),
        celula.texto(cliente.email),
        celula.texto(cliente.telefone),
        celula.texto(cliente.observacoes),
        celula.inteiro(cliente.processos),
        celula.diaDe(cliente.criadoEm),
      ]),
    },
  ];
}
