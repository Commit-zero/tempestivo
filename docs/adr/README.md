# Registro de decisões de arquitetura

Cada arquivo registra uma decisão: o contexto, o que foi decidido e o que isso custa.

| ADR | Decisão | Status |
| --- | --- | --- |
| [0001](0001-monolito-modular.md) | Usar um monólito modular, não microsserviços | aceito |
| [0002](0002-portas-e-adaptadores.md) | Isolar tudo o que é externo em portas e adaptadores | aceito |
| [0003](0003-isolamento-por-conta.md) | Isolar os dados pela conta (contaId) | aceito |
| [0004](0004-datas-civis-como-texto.md) | Guardar datas civis como texto AAAA-MM-DD | aceito |
| [0005](0005-calculadora-de-prazos-pura.md) | Tratar a calculadora como domínio puro, que recusa em vez de chutar | aceito |
| [0006](0006-login-proprio-com-api-fechada.md) | Usar Better Auth com a API HTTP fechada | aceito |
| [0007](0007-jobs-por-http-idempotentes.md) | Disparar jobs idempotentes por HTTP | aceito |
| [0008](0008-leitor-de-intimacao-local.md) | Ler a intimação no próprio servidor, por regras | aceito |
| [0009](0009-agenda-por-icalendar.md) | Entregar a agenda por feed iCalendar, sem integração | aceito |
| [0010](0010-hospedagem-vercel-supabase-e-docker.md) | Hospedar na Vercel com Supabase, com Docker como saída | aceito |
| [0011](0011-limitador-em-memoria.md) | Limitar tentativas em memória | aceito |
| [0012](0012-segundo-fator-totp.md) | Oferecer segundo fator por aplicativo autenticador | aceito |
| [0013](0013-identidade-avisos-e-confirmacao.md) | Adotar a identidade Protocolo, com avisos e confirmação | aceito |
| [0014](0014-planilhas-geradas-na-hora.md) | Gerar planilhas na hora, com um só ponto de acesso à biblioteca | aceito |
| [0015](0015-supabase-sem-data-api.md) | Usar o Supabase só como PostgreSQL, com a Data API desligada | aceito |
| [0016](0016-limites-do-produto-nesta-fase.md) | Manter o produto sem equipes, cobrança automática, consulta de CPF e anexos | aceito |

## Como registrar

1. Crie `NNNN-titulo-em-kebab-case.md` com o próximo número.
2. Preencha Status, Contexto, Decisão e Consequências. Acrescente "Opções consideradas" e "Critério de revisão" quando houver o que dizer.
3. Não edite um ADR aceito para mudar a decisão: crie outro, marque o antigo como `substituído por NNNN` e ligue os dois.
4. Inclua o ADR na tabela acima, no mesmo pull request.

Registre o que for difícil de reverter, atingir mais de um módulo ou contrariar o que quem chega esperaria.
