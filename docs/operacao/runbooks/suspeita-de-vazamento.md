# Runbook: suspeita de vazamento de dados

- **Severidade típica:** crítica
- **Dono:** responsável pelo serviço

## Sintoma

Alguém vê dados de outra conta, um segredo foi exposto ou há acesso que ninguém reconhece.

## Mitigação

1. Trate como crítico (ver [SECURITY.md](../../../SECURITY.md)). Preserve os logs.
2. Troque os segredos ([runbook de troca de segredos](troca-de-segredos.md)) e, se o banco pode ter sido exposto, a senha do banco no Supabase.
3. Se um link de agenda vazou, o titular troca o link em Conta; o anterior para na hora.
4. Avalie o dever de comunicar a ANPD e os titulares (LGPD, art. 48) com quem responde juridicamente pelo serviço. Faça isso **no mesmo dia**: o prazo é curto.

## Prazos de comunicação

Pela Resolução CD/ANPD nº 15/2024, quando o incidente pode causar risco ou dano relevante, o controlador comunica a ANPD e os titulares em **3 dias úteis** a partir do conhecimento de que dados pessoais foram afetados. Há prazo em dobro para agentes de pequeno porte, e o registro do incidente, comunicado ou não, deve ser guardado por pelo menos 5 anos.

> Resumo feito a partir de fontes secundárias em 26/11/2026. Confira o texto vigente no site da ANPD antes de agir.

Para dados de clientes do advogado, o Tempestivo é operador: avise o advogado, que é o controlador, sem demora.
