import Link from "next/link";
import { ProdutoCard } from "@/components/ProdutoCard";
import { buscar, categorias, marcas, tamanhosDisponiveis, type Ordem } from "@/lib/catalogo";

const POR_PAGINA = 24;
type Q = { q?: string; categoria?: string; marca?: string; tamanho?: string; promo?: string; ordem?: string; pagina?: string };

export default async function Produtos({ searchParams }: { searchParams: Promise<Q> }) {
  const q = await searchParams;
  const ordem = (["menor", "maior", "promo", "novo"].includes(q.ordem ?? "") ? q.ordem : "relevancia") as Ordem;
  const lista = buscar({ q: q.q, categoria: q.categoria, marca: q.marca, tamanho: q.tamanho, promo: q.promo === "1", ordem });
  const pagina = Math.max(1, Number(q.pagina) || 1);
  const totalPaginas = Math.max(1, Math.ceil(lista.length / POR_PAGINA));
  const visiveis = lista.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);

  const href = (mudar: Partial<Q>) => {
    const p = new URLSearchParams();
    const novo = { ...q, pagina: undefined, ...mudar };
    for (const [k, v] of Object.entries(novo)) if (v) p.set(k, String(v));
    return `/produtos${p.size ? `?${p}` : ""}`;
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
      <aside className="space-y-5 text-sm">
        <Grupo titulo="Categoria">
          {categorias().map((c) => (
            <Opcao key={c.valor} ativo={q.categoria === c.valor} href={href({ categoria: q.categoria === c.valor ? undefined : c.valor })}>
              {c.valor} <span className="text-fraco">({c.n})</span>
            </Opcao>
          ))}
        </Grupo>
        <Grupo titulo="Marca">
          {marcas().slice(0, 14).map((m) => (
            <Opcao key={m.valor} ativo={q.marca === m.valor} href={href({ marca: q.marca === m.valor ? undefined : m.valor })}>
              {m.valor} <span className="text-fraco">({m.n})</span>
            </Opcao>
          ))}
        </Grupo>
        <Grupo titulo="Tamanho">
          <div className="flex flex-wrap gap-1.5">
            {tamanhosDisponiveis().slice(0, 30).map((t) => (
              <Link
                key={t}
                href={href({ tamanho: q.tamanho === t ? undefined : t })}
                className={`rounded border px-2 py-1 text-xs ${q.tamanho === t ? "border-texto bg-texto text-white" : "border-borda bg-painel"}`}
              >
                {t}
              </Link>
            ))}
          </div>
        </Grupo>
        <Opcao ativo={q.promo === "1"} href={href({ promo: q.promo === "1" ? undefined : "1" })}>
          Só em promoção
        </Opcao>
      </aside>

      <section>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-fraco">
            <strong className="text-texto">{lista.length}</strong> produtos{q.q ? ` para “${q.q}”` : ""}
          </p>
          <div className="flex flex-wrap gap-1.5 text-xs">
            {[
              ["relevancia", "Relevância"],
              ["menor", "Menor preço"],
              ["maior", "Maior preço"],
              ["promo", "Maior desconto"],
              ["novo", "Novidades"],
            ].map(([v, r]) => (
              <Link
                key={v}
                href={href({ ordem: v === "relevancia" ? undefined : v })}
                className={`rounded border px-2.5 py-1.5 ${ordem === v ? "border-texto bg-texto text-white" : "border-borda bg-painel"}`}
              >
                {r}
              </Link>
            ))}
          </div>
        </div>

        {visiveis.length === 0 ? (
          <p className="rounded-lg border border-borda bg-painel p-6 text-center text-fraco">
            Nenhum produto encontrado. <Link href="/produtos" className="underline">Limpar filtros</Link>
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            {visiveis.map((p) => (
              <ProdutoCard key={p.ref} p={p} />
            ))}
          </div>
        )}

        {totalPaginas > 1 ? (
          <nav className="mt-6 flex items-center justify-center gap-3 text-sm">
            {pagina > 1 ? <Link className="btn-claro" href={href({ pagina: String(pagina - 1) })}>← Anterior</Link> : null}
            <span className="text-fraco">
              Página {pagina} de {totalPaginas}
            </span>
            {pagina < totalPaginas ? <Link className="btn-claro" href={href({ pagina: String(pagina + 1) })}>Próxima →</Link> : null}
          </nav>
        ) : null}
      </section>
    </div>
  );
}

function Grupo({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-fraco">{titulo}</p>
      <div className="flex flex-col gap-1">{children}</div>
    </div>
  );
}
function Opcao({ ativo, href, children }: { ativo: boolean; href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className={`rounded px-2 py-1 ${ativo ? "bg-texto font-semibold text-white" : "hover:bg-painel"}`}>
      {children}
    </Link>
  );
}
