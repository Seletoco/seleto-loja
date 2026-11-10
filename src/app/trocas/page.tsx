import type { Metadata } from "next";
import { MODO_REAL } from "@/lib/modo";

export const metadata: Metadata = { title: "Trocas e devoluções — Seleto" };

/**
 * RASCUNHO: junta os direitos que o Código de Defesa do Consumidor já garante com o prazo de troca da loja
 * (NEXT_PUBLIC_TROCA_DIAS, definido pelo Victor). Sem o prazo definido, a página não inventa um número.
 */
export default function Trocas() {
  const dias = Number(process.env.NEXT_PUBLIC_TROCA_DIAS);
  const prazo = Number.isFinite(dias) && dias > 0 ? dias : null;
  return (
    <article className="mx-auto grid max-w-7xl gap-8 text-sm leading-relaxed lg:grid-cols-[300px_minmax(0,1fr)]">
      <header className="space-y-4 lg:sticky lg:top-28 lg:self-start">
      <h1 className="titulao text-4xl">Trocas e devoluções</h1>
      {MODO_REAL ? null : <p className="bg-destaque px-3 py-2 text-xs font-bold uppercase tracking-wide">Rascunho para revisão</p>}
      </header>

      <div className="grid items-start gap-4 md:grid-cols-2 2xl:grid-cols-3">

      <section className="space-y-2 border border-borda bg-painel p-5">
        <h2 className="text-lg font-black">Arrependimento (compra pela internet)</h2>
        <p>
          Em compras feitas pelo site com entrega em casa, você pode desistir em até <b>7 dias corridos</b> a partir do recebimento (Código de Defesa do Consumidor,
          art. 49), sem precisar explicar. O produto deve voltar sem uso e com etiqueta. Fale com a loja pelo WhatsApp para combinar a devolução.
        </p>
      </section>

      <section className="space-y-2 border border-borda bg-painel p-5">
        <h2 className="text-lg font-black">Produto com defeito</h2>
        <p>Se o produto chegar com defeito, você tem direito à solução nos prazos do Código de Defesa do Consumidor (art. 18 e 26). Fale com a loja o quanto antes, com a foto do problema.</p>
      </section>

      <section className="space-y-2 border border-borda bg-painel p-5">
        <h2 className="text-lg font-black">Troca de tamanho ou cor</h2>
        <p>
          {prazo ? <>Trocamos tamanho ou cor em até <b>{prazo} dias</b> após a compra, em qualquer loja Seleto, com o produto sem uso, com etiqueta e com o comprovante.</> : "O prazo para troca de tamanho ou cor é combinado com a loja no atendimento."}
        </p>
      </section>

      <section className="space-y-2 border border-borda bg-painel p-5">
        <h2 className="text-lg font-black">Retirada na loja</h2>
        <p>Nos pedidos para retirar na loja, você confere o produto no balcão antes de pagar. A loja confirma a disponibilidade antes de separar.</p>
      </section>
      </div>
    </article>
  );
}
