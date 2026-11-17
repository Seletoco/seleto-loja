import type { Metadata } from "next";
import { MODO_REAL } from "@/lib/modo";

export const metadata: Metadata = { title: "Política de privacidade — Seleto", alternates: { canonical: "/privacidade" } };

const ATUALIZADA = "17 de novembro de 2026";

/**
 * Descreve o que o sistema faz de fato com os dados (CPF para nota fiscal, pagamento pela Rede, entrega, nota pelo PDVNet).
 * Os dados da empresa vêm de variáveis da Vercel (NEXT_PUBLIC_EMPRESA_RAZAO, NEXT_PUBLIC_EMPRESA_CNPJ, NEXT_PUBLIC_CONTATO_PRIVACIDADE).
 * Se o sistema mudar (novo fornecedor, novo dado), este texto precisa mudar junto. Recomenda-se revisão por advogado.
 */
export default function Privacidade() {
  const razao = process.env.NEXT_PUBLIC_EMPRESA_RAZAO;
  const cnpj = process.env.NEXT_PUBLIC_EMPRESA_CNPJ;
  const contato = process.env.NEXT_PUBLIC_CONTATO_PRIVACIDADE;
  return (
    <article className="mx-auto grid max-w-7xl gap-8 text-sm leading-relaxed lg:grid-cols-[300px_minmax(0,1fr)]">
      <header className="space-y-4 lg:sticky lg:top-28 lg:self-start">
        <h1 className="titulao text-4xl">Política de privacidade</h1>
        <p className="text-xs text-fraco">Atualizada em {ATUALIZADA}.</p>
        <p className="text-fraco">Explicamos, em linguagem simples, quais dados usamos na loja online, para quê, com quem compartilhamos e como você exerce seus direitos (Lei Geral de Proteção de Dados, Lei 13.709/2018).</p>
        {MODO_REAL ? null : <p className="bg-destaque px-3 py-2 text-xs font-bold uppercase tracking-wide">Texto em revisão jurídica</p>}
      </header>

      <div className="grid items-start gap-4 md:grid-cols-2 2xl:grid-cols-3">
        <section className="space-y-2 border border-borda bg-painel p-5 md:col-span-2">
          <h2 className="text-lg font-black">Quem cuida dos seus dados</h2>
          <p>
            {razao ? <>{razao}{cnpj ? <> (CNPJ {cnpj})</> : null} é a </> : "A Seleto é a "}
            controladora dos dados tratados nas lojas Seleto e nesta loja online, isto é, quem decide como eles são usados.
            {contato ? <> Para falar sobre seus dados: <b>{contato}</b>.</> : " Para falar sobre seus dados, procure uma das nossas lojas."}
          </p>
        </section>

        <section className="space-y-2 border border-borda bg-painel p-5 md:col-span-2">
          <h2 className="text-lg font-black">Quais dados usamos, para quê e com qual base legal</h2>
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <b>Dados do pedido</b>: nome, celular, e-mail (opcional), endereço de entrega (CEP, rua, número, complemento, bairro, cidade e estado) e os itens comprados.
              Usamos para separar, entregar e cobrar o seu pedido. <i>Base: execução do contrato de compra (LGPD, art. 7º, V).</i>
            </li>
            <li>
              <b>CPF</b>: é <b>obrigatório nas compras com entrega</b> e opcional na retirada. Usamos para emitir a <b>nota fiscal</b> da compra e, se você tem conta, conferir que o pedido é seu.
              Guardamos o CPF informado no pedido pelo prazo fiscal. <i>Base: cumprimento de obrigação legal e fiscal (art. 7º, II).</i>
            </li>
            <li>
              <b>Pagamento</b>: Pix e cartão são processados pela <b>Rede (Itaú)</b>. Os dados do cartão são enviados de forma protegida à Rede apenas para autorizar a cobrança e <b>não são guardados pela Seleto</b>.
              Guardamos só o necessário para conferir a compra: identificação da transação, valor, situação, bandeira e os 4 últimos dígitos. <i>Base: execução do contrato (art. 7º, V).</i>
            </li>
            <li>
              <b>Conta</b>: e-mail e senha (a senha é guardada apenas de forma codificada, nunca em texto). Usamos para você entrar e acompanhar pedidos e cashback. <i>Base: execução do contrato.</i>
            </li>
            <li>
              <b>Ligação com o cadastro das lojas</b>: você informa CPF e celular para conferirmos com o cadastro da Seleto. Nessa conferência guardamos apenas um código irreversível do CPF (hash).
            </li>
            <li>
              <b>Cashback e nível</b>: usamos o histórico de compras nas lojas e no site para calcular saldo e nível. Na tela da sua conta mostramos apenas o que ocorreu nos <b>últimos 12 meses</b>.
            </li>
            <li>
              <b>Preferências e avisos</b>: guardamos suas escolhas (por exemplo, alertas de produto e mensagens no WhatsApp). Você pode desligar quando quiser em &quot;Minha conta &gt; Ajustes&quot;. <i>Base: consentimento (art. 7º, I).</i>
            </li>
            <li>
              <b>Segurança</b>: registramos tentativas de acesso e de pedido (sem dados pessoais legíveis) para barrar fraudes e abusos. <i>Base: legítimo interesse (art. 7º, IX).</i>
            </li>
          </ul>
        </section>

        <section className="space-y-2 border border-borda bg-painel p-5 md:col-span-2">
          <h2 className="text-lg font-black">Com quem compartilhamos</h2>
          <p>Não vendemos seus dados. Compartilhamos só o necessário com quem ajuda a concluir a sua compra:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li><b>Rede (Itaú)</b>: para processar Pix e cartão.</li>
            <li><b>Transportadoras e plataforma de frete</b> (Correios e parceiros, por meio do Melhor Envio): nome, telefone, endereço e CEP, para cotar e realizar a entrega.</li>
            <li><b>Sistema de gestão e emissão de notas fiscais da Seleto (PDVNet)</b>: dados do pedido, nome, CPF e endereço, para registrar a venda e emitir a nota fiscal.</li>
            <li><b>Hospedagem e banco de dados</b> (provedores de infraestrutura em nuvem): armazenam os dados com segurança e só os tratam seguindo as nossas instruções. Esses servidores podem estar fora do Brasil, com as garantias previstas na LGPD (art. 33).</li>
            <li><b>Autoridades</b>, quando a lei exigir (por exemplo, o fisco).</li>
          </ul>
        </section>

        <section className="space-y-2 border border-borda bg-painel p-5">
          <h2 className="text-lg font-black">Cookies e armazenamento no seu aparelho</h2>
          <p>
            Usamos um cookie de sessão para manter você logado na conta e guardamos no navegador a sua sacola, a loja preferida e pedidos recentes, para a loja funcionar. Não usamos cookies de publicidade.
            Você pode apagar esses dados nas configurações do navegador; a sacola e a sessão serão perdidas.
          </p>
        </section>

        <section className="space-y-2 border border-borda bg-painel p-5">
          <h2 className="text-lg font-black">Por quanto tempo guardamos</h2>
          <p>
            Dados de pedidos, pagamentos e notas fiscais, pelo prazo exigido pela legislação fiscal e tributária (em regra, 5 anos). Dados da conta, enquanto ela existir ou até você pedir a exclusão,
            ressalvadas as obrigações legais. Depois disso, apagamos ou anonimizamos.
          </p>
        </section>

        <section className="space-y-2 border border-borda bg-painel p-5">
          <h2 className="text-lg font-black">Como protegemos</h2>
          <p>
            Conexão criptografada (HTTPS), senhas codificadas, acesso restrito ao painel da loja, cobrança sempre calculada no servidor e dados de cartão sem armazenamento. Nenhum sistema é 100% imune;
            se houver um incidente que possa causar risco relevante, avisaremos você e a Autoridade Nacional de Proteção de Dados, como a lei determina.
          </p>
        </section>

        <section className="space-y-2 border border-borda bg-painel p-5">
          <h2 className="text-lg font-black">Seus direitos (LGPD, art. 18)</h2>
          <p>
            Você pode pedir: confirmação de que tratamos seus dados, acesso, correção, anonimização, bloqueio ou eliminação de dados desnecessários, portabilidade, informação sobre com quem compartilhamos e a revogação
            de consentimentos. Alguns dados fiscais precisam ser mantidos por lei, e explicaremos quando for o caso. Respondemos em até 15 dias.
            {contato ? <> Escreva para <b>{contato}</b>.</> : " Procure uma das nossas lojas."} Se não ficar satisfeito, você pode reclamar à Autoridade Nacional de Proteção de Dados (gov.br/anpd).
          </p>
        </section>

        <section className="space-y-2 border border-borda bg-painel p-5">
          <h2 className="text-lg font-black">Mudanças nesta política</h2>
          <p>Quando algo mudar, atualizamos esta página e a data no topo. Mudanças importantes serão avisadas na loja.</p>
        </section>
      </div>
    </article>
  );
}
