"use client";

import Link from "next/link";
import type { Produto } from "@/lib/tipos";
import { reais } from "@/lib/format";
import { useCarrinho } from "@/lib/carrinho";

/** Cartão no estilo "vitrine de esporte": foto grande sobre cinza, tamanhos aparecem ao passar o mouse. */
export function ProdutoCard({ p, classe = "" }: { p: Produto; classe?: string }) {
  const { adicionar } = useCarrinho();
  const desconto = p.precoDe ? Math.round(((p.precoDe - p.preco) / p.precoDe) * 100) : 0;
  return (
    <article className={`group relative flex flex-col ${classe}`}>
      <Link href={`/produto/${p.ref}`} className="block">
        <div className="relative aspect-[4/5] overflow-hidden bg-tenue">
          {p.foto ? (
            // eslint-disable-next-line @next/next/no-img-element -- fotos vêm do catálogo (domínio externo)
            <img src={p.foto} alt={p.nome} loading="lazy" className="foto-produto size-full object-contain p-3 transition duration-500 group-hover:scale-105" />
          ) : (
            <div className="flex size-full items-center justify-center text-xs text-fraco">sem foto</div>
          )}
          {desconto > 0 ? (
            <span className="absolute left-0 top-3 bg-promo px-2.5 py-1 text-xs font-black text-white">-{desconto}%</span>
          ) : p.novo ? (
            <span className="absolute left-0 top-3 bg-texto px-2.5 py-1 text-xs font-black text-white">NOVO</span>
          ) : null}
        </div>
      </Link>

      {/* tamanhos: só no desktop com mouse; no celular a escolha é na página do produto */}
      {p.tamanhos.length > 0 && p.tamanhos.length <= 14 ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-[84px] hidden translate-y-2 bg-white/95 p-3 opacity-0 shadow-lg transition group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:opacity-100 [@media(hover:hover)]:block">
          <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-fraco">Adicionar rápido — tamanho</p>
          <div className="flex flex-wrap gap-1">
            {p.tamanhos.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => adicionar({ ref: p.ref, nome: p.nome, cor: p.cor, tamanho: t, preco: p.preco, foto: p.foto })}
                className="min-w-9 border border-borda px-2 py-1.5 text-xs font-bold hover:border-texto hover:bg-texto hover:text-white"
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <Link href={`/produto/${p.ref}`} className="mt-3 block space-y-0.5">
        <p className="line-clamp-1 text-sm font-bold">{p.nome}</p>
        <p className="text-xs text-fraco">{p.marca} · {p.categoria}</p>
        <p className="pt-1 text-sm">
          <span className="font-black">{reais(p.preco)}</span>
          {p.precoDe ? <span className="ml-2 text-xs text-fraco line-through">{reais(p.precoDe)}</span> : null}
        </p>
      </Link>
    </article>
  );
}
