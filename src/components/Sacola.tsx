"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useCarrinho } from "@/lib/carrinho";
import { reais } from "@/lib/format";

/** Sacola lateral: abre ao adicionar um item (como nas grandes lojas de esporte). */
export function Sacola() {
  const { aberta, fechar, itens, subtotal, alterar, remover } = useCarrinho();

  useEffect(() => {
    if (!aberta) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && fechar();
    window.addEventListener("keydown", esc);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", esc);
      document.body.style.overflow = "";
    };
  }, [aberta, fechar]);

  return (
    <div className={`fixed inset-0 z-50 ${aberta ? "" : "pointer-events-none"}`} aria-hidden={!aberta}>
      <div onClick={fechar} className={`absolute inset-0 bg-black/50 transition-opacity duration-300 ${aberta ? "opacity-100" : "opacity-0"}`} />
      <aside
        role="dialog"
        aria-label="Sacola"
        className={`absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-white shadow-2xl transition-transform duration-300 ${aberta ? "translate-x-0" : "translate-x-full"}`}
      >
        <header className="flex items-center justify-between border-b border-borda px-5 py-4">
          <h2 className="titulao text-2xl">Sacola</h2>
          <button onClick={fechar} aria-label="Fechar" className="text-3xl leading-none">×</button>
        </header>

        {itens.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
            <p className="text-fraco">Sua sacola está vazia.</p>
            <Link href="/produtos" onClick={fechar} className="btn">Ver produtos</Link>
          </div>
        ) : (
          <>
            <ul className="flex-1 divide-y divide-borda overflow-y-auto px-5">
              {itens.map((i) => (
                <li key={i.ref + i.tamanho} className="flex gap-4 py-4">
                  <div className="size-24 shrink-0 bg-tenue">
                    {i.foto ? (
                      // eslint-disable-next-line @next/next/no-img-element -- fotos vêm do catálogo
                      <img src={i.foto} alt={i.nome} className="foto-produto size-full object-contain" />
                    ) : null}
                  </div>
                  <div className="flex flex-1 flex-col text-sm">
                    <Link href={`/produto/${i.ref}`} onClick={fechar} className="font-bold leading-tight hover:underline">{i.nome}</Link>
                    <span className="text-fraco">Tamanho {i.tamanho}</span>
                    <div className="mt-auto flex items-center justify-between">
                      <div className="flex items-center border border-borda">
                        <button className="px-2.5 py-1" onClick={() => alterar(i.ref, i.tamanho, i.quantidade - 1)} aria-label="Menos">−</button>
                        <span className="w-6 text-center">{i.quantidade}</span>
                        <button className="px-2.5 py-1" onClick={() => alterar(i.ref, i.tamanho, i.quantidade + 1)} aria-label="Mais">+</button>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">{reais(i.preco * i.quantidade)}</p>
                        <button className="text-xs text-fraco underline" onClick={() => remover(i.ref, i.tamanho)}>remover</button>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            <footer className="space-y-3 border-t border-borda p-5">
              <div className="flex justify-between text-lg font-black"><span>Subtotal</span><span>{reais(subtotal)}</span></div>
              <p className="text-xs text-fraco">Entregamos para todo o Brasil. Frete confirmado no pedido.</p>
              <Link href="/checkout" onClick={fechar} className="btn w-full">Finalizar pedido</Link>
              <button onClick={fechar} className="btn-claro w-full">Continuar comprando</button>
            </footer>
          </>
        )}
      </aside>
    </div>
  );
}
