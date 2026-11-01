"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { Produto } from "@/lib/tipos";
import { reais } from "@/lib/format";

/** Banner rotativo da home: um produto por slide, troca sozinho a cada 5s e pausa com o mouse em cima. */
export function Carrossel({ produtos }: { produtos: Produto[] }) {
  const [i, setI] = useState(0);
  const [pausado, setPausado] = useState(false);
  const total = produtos.length;
  const ir = useCallback((n: number) => setI(((n % total) + total) % total), [total]);

  useEffect(() => {
    if (pausado || total < 2) return;
    const t = setInterval(() => setI((x) => (x + 1) % total), 5000);
    return () => clearInterval(t);
  }, [pausado, total]);

  if (total === 0) return null;
  return (
    <section
      className="relative overflow-hidden rounded-xl border border-borda bg-painel"
      onMouseEnter={() => setPausado(true)}
      onMouseLeave={() => setPausado(false)}
      aria-roledescription="carrossel"
      aria-label="Destaques"
    >
      <div className="flex transition-transform duration-500 ease-out" style={{ transform: `translateX(-${i * 100}%)` }}>
        {produtos.map((p, idx) => {
          const desconto = p.precoDe ? Math.round(((p.precoDe - p.preco) / p.precoDe) * 100) : 0;
          return (
            <Link
              key={p.ref}
              href={`/produto/${p.ref}`}
              className="grid min-w-full items-center gap-4 p-6 sm:grid-cols-2 sm:px-16 sm:py-10"
              aria-hidden={idx !== i}
              tabIndex={idx === i ? 0 : -1}
            >
              <div className="order-2 space-y-3 sm:order-1">
                {desconto > 0 ? (
                  <span className="inline-block rounded bg-promo px-2.5 py-1 text-sm font-bold text-white">{desconto}% OFF</span>
                ) : (
                  <span className="inline-block rounded bg-texto px-2.5 py-1 text-sm font-bold text-white">NOVIDADE</span>
                )}
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-fraco">{p.marca}</p>
                <h2 className="text-2xl font-black leading-tight sm:text-4xl">{p.nome}</h2>
                <div>
                  {p.precoDe ? <span className="mr-2 text-sm text-fraco line-through">{reais(p.precoDe)}</span> : null}
                  <span className="text-2xl font-black sm:text-3xl">{reais(p.preco)}</span>
                </div>
                <span className="btn mt-1">Ver produto</span>
              </div>
              <div className="order-1 flex h-52 items-center justify-center rounded-lg bg-tenue sm:order-2 sm:h-80">
                {p.foto ? (
                  // eslint-disable-next-line @next/next/no-img-element -- fotos vêm do catálogo (domínio externo)
                  <img src={p.foto} alt={p.nome} className="h-full w-full object-contain p-2" />
                ) : null}
              </div>
            </Link>
          );
        })}
      </div>

      {total > 1 ? (
        <>
          <button type="button" onClick={() => ir(i - 1)} aria-label="Anterior" className="absolute left-2 top-1/2 hidden size-10 -translate-y-1/2 rounded-full border border-borda bg-painel/90 text-lg shadow sm:block">‹</button>
          <button type="button" onClick={() => ir(i + 1)} aria-label="Próximo" className="absolute right-2 top-1/2 hidden size-10 -translate-y-1/2 rounded-full border border-borda bg-painel/90 text-lg shadow sm:block">›</button>
          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-2">
            {produtos.map((p, idx) => (
              <button key={p.ref} type="button" onClick={() => ir(idx)} aria-label={`Slide ${idx + 1}`} className={`h-2 rounded-full transition-all ${idx === i ? "w-6 bg-texto" : "w-2 bg-borda"}`} />
            ))}
          </div>
        </>
      ) : null}
    </section>
  );
}
