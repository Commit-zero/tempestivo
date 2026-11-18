# Política de segurança

## Como reportar uma vulnerabilidade

Se você encontrar uma falha de segurança no Tempestivo, **não abra uma issue pública**. Use a aba **Security > Report a vulnerability** do repositório, que mantém o relato privado até a correção. Inclua o que foi encontrado, como reproduzir e o impacto esperado.

O Tempestivo guarda dados de clientes de advogados (dados pessoais, LGPD) e prazos processuais. Trate qualquer suspeita de exposição entre contas como crítica.

## O que é verificado automaticamente

A cada push, em qualquer branch (e toda segunda-feira, para CVE novas):

| Verificação | Ferramenta | Bloqueia em |
|---|---|---|
| Segredos em todo o histórico do Git | TruffleHog | qualquer achado |
| CVE nas dependências (`pnpm-lock.yaml`) | Trivy | alta ou crítica |
| Falhas no código (OWASP Top 10, React, Next.js) | Semgrep | severidade `ERROR` |
| CVE e SBOM da imagem de produção (na `main`, semanal e sob demanda) | Trivy | alta ou crítica com correção |
| Lint com fronteiras de arquitetura, tipos, testes e build | ESLint, `tsc`, Vitest, Playwright | qualquer falha |
| Cobertura mínima de testes | Vitest (v8) | abaixo da meta |

Todas as actions são fixadas por SHA de commit, as imagens por digest e os binários conferidos por `sha256`.

## Práticas do projeto

- **Isolamento por conta:** todo repositório de dados recebe `contaId` e filtra por ele; cada módulo tem um teste de que uma conta não enxerga nem altera dados de outra.
- **Senhas** em Argon2id; sessão em cookie `HttpOnly`, `SameSite=Lax` e `Secure` em HTTPS. Redefinir a senha encerra as outras sessões.
- **Tentativas de login, cadastro, redefinição e confirmação de senha** são limitadas, e as mensagens não revelam se um e-mail tem cadastro.
- **A API HTTP de autenticação fica fechada:** só passam os links dos e-mails (redefinição de senha e confirmação de e-mail). Entrar e cadastrar acontecem pelo servidor, com o limitador e o aceite dos termos.
- **Ids vindos do navegador** são validados antes de chegar ao banco: um objeto nunca vira filtro.
- **Excluir a conta** exige a senha atual.
- **E-mails a terceiros:** os alertas só vão para o e-mail confirmado da conta; o substituto só recebe avisos depois de aceitar o convite, e só com a data; há teto diário de e-mails por conta e limite de trocas de substituto.
- **Segredos** só em variáveis de ambiente, validadas na subida; a mensagem de erro lista nomes, nunca valores. O `.env` é ignorado pelo Git.
- **Logs** estruturados com redação de segredos e de dados pessoais por nome de campo. E-mail, texto de intimação e conteúdo de prazo não vão para o log; erros de job registram só o tipo e o código.
- **Jobs** autenticados por segredo comparado em tempo constante, e idempotentes.
- **Link de conferência do e-mail:** token aleatório de uso único, com validade, guardado só como resumo SHA-256; a confirmação exige um clique (POST).
- **Agenda assinável:** o link do calendário leva um token aleatório de 256 bits, guardado só como resumo SHA-256 e mostrado uma única vez; desativar revoga na hora. O feed traz só o ato, o número do processo e as datas, nunca nome de cliente, parte ou assunto, porque o app de agenda guarda o conteúdo fora do sistema. A resposta vai com `Cache-Control: private` e `X-Robots-Tag: noindex`.
- **Código de servidor** (banco, sessão, raiz de composição) importa `server-only`: o build falha se um componente de cliente tentar importá-lo.
- **Leitor de intimação:** a leitura é local, o texto não é enviado a terceiros nem gravado, e a saída é validada campo a campo.
- **Cabeçalhos:** CSP, HSTS, `X-Content-Type-Options`, `X-Frame-Options` e `Referrer-Policy` em todas as respostas.
- **Banco com TLS verificado:** em produção, o app não sobe com banco remoto sem o certificado da autoridade (`DATABASE_CA_CERT`) ou `sslmode=verify-full`; com o certificado, parâmetros de TLS da URL são descartados para não enfraquecê-lo.
- **Contêiner** sem root, sem gerenciador de pacotes e sem a CLI de migração.
- **LGPD:** Termos de uso e Política de privacidade com aceite registrado (data e versão), exportação de todos os dados da conta e exclusão definitiva pela própria tela.

## Limites conhecidos

- O token da agenda vai no caminho da URL (o app de calendário não envia cabeçalho) e por isso aparece nos logs de acesso da hospedagem. Restrinja quem lê esses logs; se houver dúvida, o titular troca o link em Conta.
- Quem tiver o link da agenda vê os vencimentos daquela conta até ele ser desativado: a tela avisa para não compartilhá-lo.
- O limitador de tentativas fica em memória (vale por instância) e identifica o cliente pelo `X-Forwarded-For`: o proxy da hospedagem precisa sobrescrever esse cabeçalho.
- A CSP permite `'unsafe-inline'` em scripts e estilos, exigência da hidratação do Next.js sem *nonce*.
- O teto diário de e-mails por conta usa o banco; o limite de trocas de substituto fica em memória.
- `/api/health` devolve a versão do app, como pede a especificação (RF12).
- Supressões do Trivy ficam em `.trivyignore`, com motivo e data de expiração.

## Versões com suporte

Só a versão mais recente da branch `main` recebe correções.
