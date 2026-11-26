import { Aviso } from "@/components/app/aviso";
import type { Metadata } from "next";
import Link from "next/link";
import { VERSAO_DOS_TERMOS } from "@/lib/termos";

export const metadata: Metadata = { title: "Termos de uso" };

const versao = VERSAO_DOS_TERMOS.split("-").reverse().join("/");

export default function PaginaDosTermos() {
  return (
    <>
      <h1>Termos de uso</h1>
      <p className="text-sm text-muted-foreground">Versão de {versao}.</p>
      <Aviso tipo="atencao" role="note">
        O Tempestivo está em fase de testes no Startup Challenge UMC 2026. Use apenas dados fictícios até o lançamento.
      </Aviso>

      <h2>1. O que é o Tempestivo</h2>
      <p>
        Uma ferramenta de organização para advogados: cadastro de clientes e processos, controle de prazos com cálculo
        auxiliar, alertas por e-mail, audiências, tarefas e honorários.
      </p>

      <h2>2. O cálculo de prazo é auxiliar</h2>
      <ul>
        <li>A data calculada é uma sugestão, acompanhada do passo a passo e das regras usadas. Ela pode estar errada.</li>
        <li>
          A conferência do prazo nos autos e o cumprimento dele são responsabilidade exclusiva do advogado. O Tempestivo
          não pratica atos processuais nem substitui a leitura das intimações.
        </li>
        <li>
          As regras de contagem ainda não foram validadas por um advogado. Enquanto isso, a data calculada só é salva depois
          que você declara ter conferido nos autos.
        </li>
        <li>O leitor de intimação também só sugere: o prazo só existe depois que você confere e salva.</li>
      </ul>

      <h2>3. Alertas</h2>
      <p>
        Os alertas são enviados por e-mail, ao endereço confirmado da conta, e podem atrasar ou não chegar (falha do
        provedor de e-mail, filtro de spam, limite de envios). Eles são um apoio, não uma garantia. O advogado substituto
        só recebe avisos depois de aceitar o convite enviado ao e-mail dele.
      </p>

      <h2>4. Sua conta</h2>
      <ul>
        <li>Guarde a sua senha. A conta é pessoal: no MVP, uma pessoa por conta.</li>
        <li>Você responde pelos dados que cadastra e precisa ter base legal para tratá-los, como o contrato com o seu cliente.</li>
        <li>
          Você pode exportar todos os dados ou excluir a conta a qualquer momento, na tela{" "}
          <Link href="/conta" className="text-primary underline underline-offset-4">
            Conta
          </Link>
          .
        </li>
      </ul>

      <h2>5. Uso proibido</h2>
      <p>
        É proibido usar o Tempestivo para enviar mensagens a quem não consentiu, tentar acessar dados de outras contas,
        sobrecarregar o serviço ou contornar as proteções dele. A conta pode ser suspensa nesses casos.
      </p>

      <h2>6. Disponibilidade</h2>
      <p>
        O serviço é oferecido como está, sem garantia de disponibilidade contínua. Mantenha a sua própria agenda de prazos
        enquanto o produto estiver em fase de testes.
      </p>

      <h2>7. Privacidade</h2>
      <p>
        Como os dados são tratados está na{" "}
        <Link href="/privacidade" className="text-primary underline underline-offset-4">
          Política de privacidade
        </Link>
        .
      </p>
    </>
  );
}
