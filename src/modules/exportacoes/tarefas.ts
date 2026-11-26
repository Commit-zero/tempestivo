import { celula, type Aba } from "@/lib/planilha";
import { COLUNAS, obterQuadro } from "@/modules/tarefas";

export async function abasDeTarefas(contaId: string): Promise<Aba[]> {
  const quadro = await obterQuadro(contaId);
  return [
    {
      nome: "Tarefas",
      colunas: [
        { titulo: "Título", largura: 40 }, { titulo: "Descrição", largura: 50 }, { titulo: "Coluna do quadro", largura: 18 },
        { titulo: "Data limite", largura: 14 }, { titulo: "Processo", largura: 36 },
      ],
      linhas: COLUNAS.flatMap((coluna) =>
        quadro[coluna.id].map((tarefa) => [
          celula.texto(tarefa.titulo),
          celula.texto(tarefa.descricao),
          celula.texto(coluna.titulo),
          celula.data(tarefa.limite),
          celula.texto(tarefa.processo?.assunto),
        ]),
      ),
    },
  ];
}
