# Política de segurança

## Como reportar uma vulnerabilidade

Se você encontrar uma falha de segurança no Tempestivo, **não abra uma issue pública**. Use a aba **Security > Report a vulnerability** do repositório, que mantém o relato privado até a correção. Inclua o que foi encontrado, como reproduzir e o impacto esperado.

O Tempestivo guarda dados de clientes de advogados (dados pessoais, LGPD) e prazos processuais. Trate qualquer suspeita de exposição entre contas como crítica.

## O que é verificado automaticamente

A cada Pull Request e a cada push na `main` (e toda segunda-feira, para CVE novas):

| Verificação | Ferramenta | Bloqueia em |
|---|---|---|
| Segredos em todo o histórico do Git | TruffleHog | qualquer achado |
| CVE nas dependências (`pnpm-lock.yaml`) | Trivy | alta ou crítica |
| Falhas no código (OWASP Top 10, React, Next.js) | Semgrep | severidade `ERROR` |
| CVE e SBOM da imagem de produção | Trivy | alta ou crítica com correção |
| Lint com fronteiras de arquitetura, tipos, testes e build | ESLint, `tsc`, Vitest, Playwright | qualquer falha |

Todas as actions são fixadas por SHA de commit, as imagens por digest e os binários conferidos por `sha256`.

## Práticas do projeto

- **Segredos** só em variáveis de ambiente, validadas na subida; a mensagem de erro lista nomes, nunca valores. O `.env` é ignorado pelo Git.
- **Logs** estruturados com redação de segredos e de dados pessoais por nome de campo.
- **Jobs** autenticados por segredo comparado em tempo constante.
- **Contêiner** sem root, sem gerenciador de pacotes e sem a CLI de migração.

## Versões com suporte

Só a versão mais recente da branch `main` recebe correções.
