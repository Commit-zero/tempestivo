import type { Metadata } from "next";
import Link from "next/link";
import { EMAIL_DE_PRIVACIDADE, VERSAO_DOS_TERMOS } from "@/lib/termos";

export const metadata: Metadata = { title: "Política de privacidade" };

const versao = VERSAO_DOS_TERMOS.split("-").reverse().join("/");

export default function PaginaDePrivacidade() {
  return (
    <>
      <h1>Política de privacidade</h1>
      <p className="text-sm text-muted-foreground">Versão de {versao}. Lei Geral de Proteção de Dados (Lei 13.709/2018).</p>

      <h2>1. Quem é quem</h2>
      <ul>
        <li>
          <strong>Dados da sua conta</strong> (nome, e-mail, senha): o Tempestivo é o controlador, para prestar o serviço que
          você contratou (LGPD, art. 7º, V).
        </li>
        <li>
          <strong>Dados dos seus clientes e processos</strong>: você, advogado, é o controlador; o Tempestivo é o operador e
          trata esses dados só para guardá-los e mostrá-los a você, conforme as suas instruções.
        </li>
        <li>
          <strong>Advogado substituto</strong>: guardamos o nome e o e-mail que você informar; ele recebe um convite e só
          recebe avisos se aceitar.
        </li>
      </ul>

      <h2>2. O que guardamos</h2>
      <table>
        <thead>
          <tr>
            <th>Dado</th>
            <th>Para quê</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Nome, e-mail e senha (guardada só como resumo Argon2id)</td>
            <td>Entrar na conta e receber os alertas</td>
          </tr>
          <tr>
            <td>
              Se você ligar a verificação em duas etapas: a chave do aplicativo autenticador e os códigos de recuperação (cifrados) e a
              contagem de códigos errados
            </td>
            <td>Segurança da conta</td>
          </tr>
          <tr>
            <td>Endereço IP e navegador de cada sessão</td>
            <td>Segurança da conta</td>
          </tr>
          <tr>
            <td>Clientes, processos, prazos, audiências, honorários e tarefas</td>
            <td>O próprio serviço</td>
          </tr>
          <tr>
            <td>Data e versão do aceite destes documentos</td>
            <td>Registro do aceite</td>
          </tr>
        </tbody>
      </table>
      <p>
        O texto colado no leitor de intimação é lido no próprio servidor do Tempestivo e <strong>não é guardado</strong> nem
        enviado a terceiros.
      </p>
      <p>
        O endereço IP também é usado, em memória e por pouco tempo, para limitar tentativas repetidas.
      </p>

      <h2>3. Cookies</h2>
      <p>Usamos só os cookies necessários para o serviço funcionar. Não há cookies de publicidade nem de análise de uso.</p>
      <ul>
        <li>
          <strong>Sessão:</strong> mantém você conectado. Vale por 7 dias, renovados com o uso.
        </li>
        <li>
          <strong>Verificação em duas etapas:</strong> guarda por 10 minutos o login que aguarda o código.
        </li>
        <li>
          <strong>Aviso de resultado (tempestivo.aviso):</strong> dura 20 segundos e leva só o código da mensagem que a tela
          mostra depois de uma ação, sem dado pessoal.
        </li>
      </ul>

      <h2>4. Com quem compartilhamos</h2>
      <p>
        Só com os fornecedores necessários para o serviço funcionar: hospedagem do aplicativo, banco de dados e envio de
        e-mail. Eles tratam os dados em nome do Tempestivo. Não vendemos dados e não usamos os seus dados para publicidade
        nem para treinar inteligência artificial.
      </p>
      <p>Alguns desses fornecedores podem tratar dados fora do Brasil.</p>
      <p>Os e-mails ao advogado substituto levam só o seu nome e a data do prazo, nunca o processo ou o cliente.</p>
      <p>
        Se você ligar a agenda no celular, o serviço de calendário que você escolher (Google, Apple, Microsoft ou outro) passa
        a receber, pelo link secreto, a descrição de cada prazo em aberto, o número do processo, o tribunal, as datas e o local das
        audiências. Nomes de clientes e de partes, o assunto do processo e links de sala virtual não são enviados. Você pode
        trocar ou desligar o link a qualquer momento na tela Conta.
      </p>

      <h2>5. Por quanto tempo</h2>
      <ul>
        <li>
          <strong>Conta e dados cadastrados:</strong> enquanto a conta existir. Ao excluir a conta, a conta, o login, as
          sessões e todos os dados cadastrados são apagados na hora, sem possibilidade de recuperação.
        </li>
        <li>
          <strong>Sessões (com IP e navegador) e códigos temporários:</strong> depois de vencidos, são apagados por uma
          rotina automática, que roda várias vezes ao dia.
        </li>
        <li>
          <strong>Registros técnicos e cópias de segurança dos fornecedores:</strong> seguem os prazos de cada fornecedor.
        </li>
      </ul>

      <h2>6. Seus direitos</h2>
      <ul>
        <li>
          <strong>Acesso e portabilidade:</strong> exporte todos os dados em JSON na tela{" "}
          <Link href="/conta" className="text-primary underline underline-offset-4">
            Conta
          </Link>
          .
        </li>
        <li>
          <strong>Correção:</strong> edite qualquer cadastro nas próprias telas.
        </li>
        <li>
          <strong>Eliminação:</strong> exclua a conta e todos os dados na tela Conta, confirmando com a sua senha.
        </li>
      </ul>
      <p>
        Os seus clientes exercem os direitos deles junto a você, que é o controlador dos dados deles; o Tempestivo oferece
        as ferramentas para atendê-los.
      </p>

      <h2>7. Como falar conosco</h2>
      <p>
        Para exercer os seus direitos, tirar dúvidas sobre os seus dados ou relatar um problema de privacidade, escreva para{" "}
        <a href={`mailto:${EMAIL_DE_PRIVACIDADE}`} className="inline-flex min-h-11 items-center break-all underline">
          {EMAIL_DE_PRIVACIDADE}
        </a>
        . Podemos pedir informações para confirmar a sua identidade antes de atender. Você também pode apresentar uma
        reclamação à Autoridade Nacional de Proteção de Dados (ANPD).
      </p>

      <h2>8. Segurança</h2>
      <p>
        Conexão cifrada, senhas com Argon2id, isolamento dos dados de cada conta, logs sem dados pessoais e verificações
        automáticas de segurança no código. Nenhum sistema é infalível: se suspeitar de um problema, exclua os dados
        sensíveis e avise pelo canal acima.
      </p>
    </>
  );
}
