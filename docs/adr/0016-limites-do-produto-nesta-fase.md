# 0016. Manter o produto sem equipes, cobrança automática, consulta de CPF e anexos

- **Status:** aceito
- **Registrado em:** 2026-11-25

## Contexto

O projeto tem custo zero e equipe de duas pessoas. Algumas capacidades pedidas para a versão comercial exigem serviço pago, mudança no modelo de isolamento ou obrigações novas de guarda de dados.

## Decisão

| Assunto | Decisão | Motivo |
| --- | --- | --- |
| Várias pessoas por conta | Adiado. Exige especificação própria | Hoje há uma conta por usuário, e o isolamento depende disso |
| Assinaturas e faturamento | Sem gateway. Quando houver, o primeiro passo é o registro manual | Gateway é serviço pago |
| Consulta oficial de CPF | Não há. O CPF tem só a validação local dos dígitos, e a tela não a chama de consulta | A API oficial é contratada e cobrada por consumo. Não automatizar o site da Receita |
| Anexos de documentos | Não há envio de arquivos | Exige credencial nova em produção, controle de acesso, antivírus e política de retenção |
| Hospedagem comercial | Continua no plano Hobby, sem cobrar de ninguém | O plano é só para uso não comercial |

## Consequências

O produto não pode ser vendido na hospedagem atual. Antes de vender, é preciso rever a hospedagem, os Termos de uso e a Política de privacidade com apoio jurídico.

## Critério de revisão

Decisão de cobrar pelo produto ou de atender escritórios com mais de uma pessoa.
