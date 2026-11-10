import type { Metadata } from "next";
import { MODO_REAL } from "@/lib/modo";

export const metadata: Metadata = { title: "Política de privacidade — Seleto" };

/**
 * RASCUNHO técnico: descreve o que o sistema faz de fato com os dados. Os dados da empresa vêm de variáveis da Vercel
 * (NEXT_PUBLIC_EMPRESA_RAZAO, NEXT_PUBLIC_EMPRESA_CNPJ, NEXT_PUBLIC_CONTATO_PRIVACIDADE). O texto jurídico final deve ser revisado por um advogado.
 */
export default function Privacidade() {
  const razao = process.env.NEXT_PUBLIC_EMPRESA_RAZAO;
  const cnpj = process.env.NEXT_PUBLIC_EMPRESA_CNPJ;
  const contato = process.env.NEXT_PUBLIC_CONTATO_PRIVACIDADE;
  return (
    <article className="mx-auto grid max-w-7xl gap-8 text-sm leading-relaxed lg:grid-cols-[300px_minmax(0,1fr)]">
      <header className="space-y-4 lg:sticky lg:top-28 lg:self-start">
      <h1 className="titulao text-4xl">Política de privacidade</h1>
      {MODO_REAL ? null : <p className="bg-destaque px-3 py-2 text-xs font-bold uppercase tracking-wide">Rascunho para revisão jurídica</p>}
      </header>

      <div className="grid items-start gap-4 md:grid-cols-2 2xl:grid-cols-3">

      <section className="space-y-2 border border-borda bg-painel p-5 md:col-span-2">
        <h2 className="text-lg font-black">Quem cuida dos seus dados</h2>
        <p>
          {razao ? <>{razao}{cnpj ? <> — CNPJ {cnpj}</> : null} é a </> : "A Seleto é a "}
          responsável pelas lojas Seleto e por esta loja online.
          {contato ? <> Para falar sobre seus dados: <b>{contato}</b>.</> : " Para falar sobre seus dados, procure uma das nossas lojas."}
        </p>
      </section>

      <section className="space-y-2 border border-borda bg-painel p-5 md:col-span-2">
        <h2 className="text-lg font-black">Quais dados usamos e para quê</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li><b>Pedido:</b> nome, celular, e-mail (opcional) e, se for entrega em casa, o endereço. Usamos para separar, entregar e combinar o pagamento do seu pedido.</li>
          <li><b>Conta:</b> e-mail e senha (guardamos só uma versão codificada da senha, nunca a senha em si). Usamos para você entrar na sua conta.</li>
          <li><b>Ligação com o cadastro das lojas:</b> você informa CPF e celular para conferirmos com o cadastro da Seleto. O CPF é usado só para essa conferência: guardamos apenas um código irreversível dele (hash), não o número.</li>
          <li><b>Cashback e nível:</b> usamos seu histórico de compras nas lojas Seleto para calcular saldo de cashback e nível.</li>
          <li><b>Preferências e avisos:</b> se você pedir &quot;me avise quando chegar&quot; ou ligar mensagens no WhatsApp, guardamos esse pedido e sua escolha.</li>
          <li><b>Segurança:</b> registramos tentativas de entrada (sem dados pessoais legíveis) para barrar abusos.</li>
        </ul>
      </section>

      <section className="space-y-2 border border-borda bg-painel p-5">
        <h2 className="text-lg font-black">Com quem compartilhamos</h2>
        <p>
          Não vendemos seus dados. Para entregas pelos Correios, o endereço e o CEP são usados na cotação e no envio. Usamos serviços de hospedagem e banco de dados
          para manter a loja no ar. Não cobramos pagamento por este site.
        </p>
      </section>

      <section className="space-y-2 border border-borda bg-painel p-5">
        <h2 className="text-lg font-black">Seus direitos (LGPD)</h2>
        <p>
          Você pode pedir confirmação de que tratamos seus dados, acesso, correção, anonimização ou exclusão, e informações sobre compartilhamento
          (Lei 13.709/2018, art. 18). Se você não quiser mais receber avisos, desligue em &quot;Minha conta &gt; Ajustes&quot;.
        </p>
      </section>

      <section className="space-y-2 border border-borda bg-painel p-5">
        <h2 className="text-lg font-black">Por quanto tempo guardamos</h2>
        <p>Guardamos os pedidos pelo tempo necessário para atender você e cumprir obrigações legais e fiscais. Os demais dados, enquanto sua conta existir ou até você pedir a exclusão.</p>
      </section>
      </div>
    </article>
  );
}
