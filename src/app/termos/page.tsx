import type { Metadata } from "next";
import { MODO_REAL } from "@/lib/modo";

export const metadata: Metadata = { title: "Termos de compra — Seleto", alternates: { canonical: "/termos" } };

const ATUALIZADA = "17 de novembro de 2026";

/** Regras da compra online: pagamento, entrega, preços e nota fiscal. Complementa a política de privacidade e a de trocas. */
export default function Termos() {
  const razao = process.env.NEXT_PUBLIC_EMPRESA_RAZAO;
  const cnpj = process.env.NEXT_PUBLIC_EMPRESA_CNPJ;
  return (
    <article className="mx-auto grid max-w-7xl gap-8 text-sm leading-relaxed lg:grid-cols-[300px_minmax(0,1fr)]">
      <header className="space-y-4 lg:sticky lg:top-28 lg:self-start">
        <h1 className="titulao text-4xl">Termos de compra</h1>
        <p className="text-xs text-fraco">Atualizados em {ATUALIZADA}.</p>
        <p className="text-fraco">Como funciona comprar na loja online da Seleto. Ao finalizar um pedido, você concorda com estas regras.</p>
        {MODO_REAL ? null : <p className="bg-destaque px-3 py-2 text-xs font-bold uppercase tracking-wide">Texto em revisão jurídica</p>}
      </header>

      <div className="grid items-start gap-4 md:grid-cols-2 2xl:grid-cols-3">
        <section className="space-y-2 border border-borda bg-painel p-5">
          <h2 className="text-lg font-black">Quem vende</h2>
          <p>
            A venda é feita por {razao ? <>{razao}{cnpj ? <> (CNPJ {cnpj})</> : null}</> : "a Seleto"}, que também emite a nota fiscal da compra.
          </p>
        </section>

        <section className="space-y-2 border border-borda bg-painel p-5">
          <h2 className="text-lg font-black">Preços e disponibilidade</h2>
          <p>
            Os preços são em reais e valem no momento do pedido. O estoque é compartilhado com as lojas físicas e pode mudar durante a compra; se algum item acabar, avisamos e devolvemos o valor pago
            ou combinamos uma alternativa com você. Erros evidentes de preço ou de descrição podem ser corrigidos antes da confirmação do pedido.
          </p>
        </section>

        <section className="space-y-2 border border-borda bg-painel p-5">
          <h2 className="text-lg font-black">Formas de pagamento</h2>
          <p>
            <b>Pix</b> e <b>cartão de crédito</b>, processados pela Rede (Itaú), ou pagamento na loja, nos pedidos para retirar. O Pix tem prazo de validade, que aparece na tela, e o pedido é confirmado assim que o pagamento é recebido.
            No cartão, a aprovação é feita pelo banco emissor; se for recusada, nenhum valor é cobrado. Parcelamento, quando disponível, é informado antes de pagar.
          </p>
        </section>

        <section className="space-y-2 border border-borda bg-painel p-5">
          <h2 className="text-lg font-black">Entrega e retirada</h2>
          <p>
            Entregamos para todo o Brasil por transportadoras (Correios e parceiros). O frete e o prazo são calculados pelo CEP antes de você pagar. O prazo é contado em dias úteis a partir da postagem do pedido,
            que acontece após a confirmação do pagamento e a separação. Na retirada, não há frete e você retira na loja escolhida.
          </p>
        </section>

        <section className="space-y-2 border border-borda bg-painel p-5">
          <h2 className="text-lg font-black">Nota fiscal e CPF</h2>
          <p>
            Toda compra tem nota fiscal. Na entrega, precisamos do seu CPF para emiti-la; na retirada, ele é opcional. Confira seus dados antes de finalizar: a nota segue as informações do pedido.
            Veja a <a href="/privacidade" className="font-bold underline">política de privacidade</a>.
          </p>
        </section>

        <section className="space-y-2 border border-borda bg-painel p-5">
          <h2 className="text-lg font-black">Receber o pedido</h2>
          <p>
            Confira o produto na entrega. Se a embalagem estiver violada ou o produto não for o pedido, recuse ou registre na hora e fale com a loja. Informe um endereço completo e alguém para receber:
            novas tentativas ou reenvios por endereço incorreto podem ter custo.
          </p>
        </section>

        <section className="space-y-2 border border-borda bg-painel p-5">
          <h2 className="text-lg font-black">Cashback</h2>
          <p>O cashback segue as regras do programa da Seleto, que você consulta em &quot;Meu cashback&quot;. Elas valem para as compras nas lojas e no site.</p>
        </section>

        <section className="space-y-2 border border-borda bg-painel p-5">
          <h2 className="text-lg font-black">Trocas, devoluções e arrependimento</h2>
          <p>Veja as regras completas em <a href="/trocas" className="font-bold underline">Trocas e devoluções</a>. Você tem 7 dias para desistir de compras feitas pelo site, nos termos do Código de Defesa do Consumidor.</p>
        </section>

        <section className="space-y-2 border border-borda bg-painel p-5">
          <h2 className="text-lg font-black">Atendimento</h2>
          <p>Para dúvidas, acompanhamento de pedido ou reclamações, fale com a loja pelo WhatsApp (link no rodapé). Sua reclamação também pode ser registrada nos órgãos de defesa do consumidor.</p>
        </section>
      </div>
    </article>
  );
}
