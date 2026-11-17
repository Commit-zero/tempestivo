import type { Metadata } from "next";
import Link from "next/link";
import { VERSAO_DOS_TERMOS } from "@/lib/termos";

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
            <td>Endereço IP e navegador de cada sessão</td>
            <td>Segurança da conta</td>
          </tr>
          <tr>
            <td>Clientes, processos, prazos, audiências, honorários e tarefas</td>
            <td>O próprio serviço</td>
          </tr>
          <tr>
            <td>Data e versão do aceite destes documentos</td>
            <td>Registro do consentimento</td>
          </tr>
        </tbody>
      </table>
      <p>
        O texto colado no leitor de intimação é lido no próprio servidor do Tempestivo e <strong>não é guardado</strong> nem
        enviado a terceiros.
      </p>

      <h2>3. Com quem compartilhamos</h2>
      <p>
        Só com os fornecedores necessários para o serviço funcionar: hospedagem do aplicativo, banco de dados e envio de
        e-mail. Eles tratam os dados em nome do Tempestivo. Não vendemos dados e não usamos os seus dados para publicidade
        nem para treinar inteligência artificial.
      </p>
      <p>Os e-mails ao advogado substituto levam só o seu nome e a data do prazo, nunca o processo ou o cliente.</p>

      <h2>4. Por quanto tempo</h2>
      <p>
        Enquanto a conta existir. Ao excluir a conta, a conta, o login, as sessões e todos os dados cadastrados são apagados
        na hora, sem possibilidade de recuperação.
      </p>

      <h2>5. Seus direitos</h2>
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

      <h2>6. Segurança</h2>
      <p>
        Conexão cifrada, senhas com Argon2id, isolamento dos dados de cada conta, logs sem dados pessoais e verificações
        automáticas de segurança no código. Nenhum sistema é infalível: se suspeitar de um problema, exclua os dados
        sensíveis e nos avise.
      </p>
    </>
  );
}
