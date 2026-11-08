"use client";

import Link from "next/link";
import { useCarrinho } from "@/lib/carrinho";
import { reais } from "@/lib/format";
import { faixaCashback } from "@/lib/vantagens";
import { useRegrasCashback } from "@/lib/use-regras-cashback";

export default function Carrinho() {
  const { itens, subtotal, pronto, alterar, remover } = useCarrinho();
  const regras = useRegrasCashback();
  if (!pronto) return <p className="text-fraco">Carregando…</p>;
  if (itens.length === 0) {
    return (
      <div className="rounded-xl border border-borda bg-painel p-10 text-center">
        <p className="text-lg font-semibold">Seu carrinho está vazio</p>
        <Link href="/produtos" className="btn mt-4">Ver produtos</Link>
      </div>
    );
  }
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <section className="space-y-3">
        <h1 className="text-xl font-bold">Carrinho</h1>
        {itens.map((i) => (
          <article key={i.ref + i.tamanho} className="flex gap-3 rounded-lg border border-borda bg-painel p-3">
            <div className="size-24 shrink-0 overflow-hidden rounded bg-tenue">
              {i.foto ? (
                // eslint-disable-next-line @next/next/no-img-element -- fotos vêm do catálogo
                <img src={i.foto} alt={i.nome} className="size-full object-contain" />
              ) : null}
            </div>
            <div className="flex flex-1 flex-col gap-1">
              <Link href={`/produto/${i.ref}`} className="text-sm font-medium hover:underline">{i.nome}</Link>
              <p className="text-xs text-fraco">Tamanho {i.tamanho}{i.cor ? ` · ${i.cor}` : ""}</p>
              <div className="mt-auto flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button className="btn-claro !px-2.5 !py-1" onClick={() => alterar(i.ref, i.tamanho, i.quantidade - 1)} aria-label="Menos">−</button>
                  <span className="w-6 text-center text-sm">{i.quantidade}</span>
                  <button className="btn-claro !px-2.5 !py-1" onClick={() => alterar(i.ref, i.tamanho, i.quantidade + 1)} aria-label="Mais">+</button>
                  <button className="ml-2 text-xs text-fraco underline" onClick={() => remover(i.ref, i.tamanho)}>remover</button>
                </div>
                <span className="font-bold">{reais(i.preco * i.quantidade)}</span>
              </div>
            </div>
          </article>
        ))}
      </section>
      <aside className="h-fit space-y-3 rounded-lg border border-borda bg-painel p-4">
        <div className="flex justify-between text-sm"><span>Subtotal</span><strong>{reais(subtotal)}</strong></div>
        {(() => {
          const f = faixaCashback(subtotal, regras.ganhoMinPct, regras.ganhoMaxPct);
          return (
            <p className="bg-tenue px-3 py-2 text-xs">
              {f ? <>Esta compra gera de <b>{reais(f.min)}</b>{f.max !== f.min ? <> a <b>{reais(f.max)}</b></> : null} de cashback (o percentual depende da forma de pagamento no caixa).</> : <>Esta compra gera cashback Seleto para as próximas compras.</>}
            </p>
          );
        })()}
        <p className="text-xs text-fraco">A entrega é calculada no próximo passo.</p>
        <Link href="/checkout" className="btn w-full">Finalizar pedido</Link>
        <Link href="/produtos" className="btn-claro w-full">Continuar comprando</Link>
      </aside>
    </div>
  );
}
