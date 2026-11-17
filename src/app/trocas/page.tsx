import type { Metadata } from "next";
import { MODO_REAL } from "@/lib/modo";

export const metadata: Metadata = { title: "Trocas e devoluções — Seleto", alternates: { canonical: "/trocas" } };

const ATUALIZADA = "17 de novembro de 2026";

/**
 * Junta os direitos que o Código de Defesa do Consumidor já garante com o prazo de troca da loja
 * (NEXT_PUBLIC_TROCA_DIAS, definido pelo Victor). Sem o prazo definido, a página não inventa um número.
 */
export default function Trocas() {
  const dias = Number(process.env.NEXT_PUBLIC_TROCA_DIAS);
  const prazo = Number.isFinite(dias) && dias > 0 ? dias : null;
  return (
    <article className="mx-auto grid max-w-7xl gap-8 text-sm leading-relaxed lg:grid-cols-[300px_minmax(0,1fr)]">
      <header className="space-y-4 lg:sticky lg:top-28 lg:self-start">
        <h1 className="titulao text-4xl">Trocas e devoluções</h1>
        <p className="text-xs text-fraco">Atualizada em {ATUALIZADA}.</p>
        <p className="text-fraco">Seus direitos como consumidor (Código de Defesa do Consumidor, Lei 8.078/1990) valem em todas as compras da Seleto, na loja e no site.</p>
        {MODO_REAL ? null : <p className="bg-destaque px-3 py-2 text-xs font-bold uppercase tracking-wide">Texto em revisão jurídica</p>}
      </header>

      <div className="grid items-start gap-4 md:grid-cols-2 2xl:grid-cols-3">
        <section className="space-y-2 border border-borda bg-painel p-5">
          <h2 className="text-lg font-black">Arrependimento (compra pelo site)</h2>
          <p>
            Em compras feitas pelo site, você pode desistir em até <b>7 dias corridos</b> a partir do <b>recebimento</b> do produto (ou da retirada na loja), sem precisar explicar o motivo
            (art. 49 do CDC). O produto deve voltar sem uso, com etiqueta e na embalagem. Fale com a loja pelo WhatsApp para combinar a devolução.
          </p>
        </section>

        <section className="space-y-2 border border-borda bg-painel p-5">
          <h2 className="text-lg font-black">Como devolvemos o dinheiro</h2>
          <p>
            Devolvemos <b>todos os valores pagos</b>, incluindo o frete, pelo mesmo meio de pagamento: <b>Pix</b> volta por Pix; no <b>cartão</b> a devolução é feita como estorno, e o prazo para aparecer na fatura
            depende do banco emissor (pode levar até duas faturas). Se você usou cashback, falamos com você sobre como ele será tratado.
          </p>
        </section>

        <section className="space-y-2 border border-borda bg-painel p-5">
          <h2 className="text-lg font-black">Produto com defeito</h2>
          <p>
            Se o produto chegar com defeito, você tem direito à solução nos prazos do CDC (arts. 18 e 26): a reclamação pode ser feita em até <b>30 dias</b> para produtos não duráveis e <b>90 dias</b> para duráveis,
            contados da entrega (ou do momento em que o defeito aparece, se for oculto). Fale com a loja o quanto antes, com fotos do problema e o número do pedido.
          </p>
        </section>

        <section className="space-y-2 border border-borda bg-painel p-5">
          <h2 className="text-lg font-black">Troca de tamanho ou cor</h2>
          <p>
            {prazo ? <>Trocamos tamanho ou cor em até <b>{prazo} dias</b> após a compra, em qualquer loja Seleto, com o produto sem uso, com etiqueta e com o comprovante ou a nota fiscal.</> : "O prazo para troca de tamanho ou cor é combinado com a loja no atendimento."}
            {" "}Essa é uma cortesia da loja, além do arrependimento e da garantia legal.
          </p>
        </section>

        <section className="space-y-2 border border-borda bg-painel p-5">
          <h2 className="text-lg font-black">Falta de produto ou cancelamento</h2>
          <p>
            Se faltar estoque depois do pagamento, ou se o pedido for cancelado por nós, devolvemos o valor integral pelo mesmo meio de pagamento. Você também pode pedir o cancelamento antes de o pedido ser
            enviado; fale com a loja pelo WhatsApp com o número do pedido.
          </p>
        </section>

        <section className="space-y-2 border border-borda bg-painel p-5">
          <h2 className="text-lg font-black">Retirada na loja</h2>
          <p>Nos pedidos para retirar, a loja confirma a disponibilidade e avisa você. Você confere o produto no balcão antes de levá-lo; se não estiver de acordo, é só dizer na hora.</p>
        </section>

        <section className="space-y-2 border border-borda bg-painel p-5">
          <h2 className="text-lg font-black">Como pedir</h2>
          <p>Fale com a loja pelo WhatsApp (link no rodapé do site) informando o número do pedido e o que aconteceu. Entregamos o comprovante da devolução e acompanhamos até a conclusão.</p>
        </section>
      </div>
    </article>
  );
}
