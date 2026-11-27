# Runbook: suspeita de vazamento de dados

- **Severidade típica:** crítica
- **Dono:** responsável pelo serviço

## Sintoma

Alguém vê dados de outra conta, um segredo foi exposto ou há acesso que ninguém reconhece.

## Mitigação

1. Trate como crítico (ver [SECURITY.md](../../../SECURITY.md)). Preserve os logs.
2. Troque os segredos ([runbook de troca de segredos](troca-de-segredos.md)) e, se o banco pode ter sido exposto, a senha do banco no Supabase.
3. Se um link de agenda vazou, o titular troca o link em Conta; o anterior para na hora.
4. Avalie o dever de comunicar a ANPD e os titulares (LGPD, art. 48) com quem responde juridicamente pelo serviço.
