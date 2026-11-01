import Link from "next/link";
import type { Produto } from "@/lib/tipos";
import { reais } from "@/lib/format";

export function ProdutoCard({ p }: { p: Produto }) {
  const desconto = p.precoDe ? Math.round(((p.precoDe - p.preco) / p.precoDe) * 100) : 0;
  return (
    <Link
      href={`/produto/${p.ref}`}
      className="group flex flex-col overflow-hidden rounded-lg border border-borda bg-painel transition hover:border-texto"
    >
      <div className="relative aspect-square bg-tenue">
        {p.foto ? (
          // eslint-disable-next-line @next/next/no-img-element -- fotos vêm do catálogo (domínio externo)
          <img src={p.foto} alt={p.nome} loading="lazy" className="size-full object-contain p-2" />
        ) : (
          <div className="flex size-full items-center justify-center text-xs text-fraco">sem foto</div>
        )}
        {desconto > 0 ? (
          <span className="absolute left-2 top-2 rounded bg-promo px-2 py-0.5 text-xs font-bold text-white">-{desconto}%</span>
        ) : p.novo ? (
          <span className="absolute left-2 top-2 rounded bg-texto px-2 py-0.5 text-xs font-bold text-white">NOVO</span>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-fraco">{p.marca}</span>
        <span className="line-clamp-2 text-sm font-medium leading-snug group-hover:underline">{p.nome}</span>
        <div className="mt-auto pt-2">
          {p.precoDe ? <span className="mr-2 text-xs text-fraco line-through">{reais(p.precoDe)}</span> : null}
          <span className="text-base font-bold">{reais(p.preco)}</span>
        </div>
      </div>
    </Link>
  );
}
