import type { Metadata } from "next";
import Link from "next/link";
import { ProdutoCard } from "@/components/ProdutoCard";
import { ehGenero } from "@/lib/genero";
import { LINK_CLUBE_FARM } from "@/lib/vantagens";
import { buscar, categorias, garantirCatalogo, marcas, tamanhosDisponiveis, type Ordem } from "@/lib/catalogo";

export const metadata: Metadata = { title: "Todos os produtos", alternates: { canonical: "/produtos" } };

const POR_PAGINA = 24;
type Q = { q?: string; categoria?: string; marca?: string; tamanho?: string; promo?: string; genero?: string; ordem?: string; pagina?: string };

const ORDENS: [string, string][] = [
  ["relevancia", "Relevância"],
  ["novo", "Novidades"],
  ["promo", "Maior desconto"],
  ["menor", "Menor preço"],
  ["maior", "Maior preço"],
];

export default async function Produtos({ searchParams }: { searchParams: Promise<Q> }) {
  const q = await searchParams;
  await garantirCatalogo();
  const ordem = (["menor", "maior", "promo", "novo"].includes(q.ordem ?? "") ? q.ordem : "relevancia") as Ordem;
  const lista = buscar({ q: q.q, categoria: q.categoria, marca: q.marca, tamanho: q.tamanho, promo: q.promo === "1", genero: ehGenero(q.genero) ? q.genero : undefined, ordem });
  const pagina = Math.max(1, Number(q.pagina) || 1);
  const totalPaginas = Math.max(1, Math.ceil(lista.length / POR_PAGINA));
  const visiveis = lista.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);

  const href = (mudar: Partial<Q>) => {
    const p = new URLSearchParams();
    const novo = { ...q, pagina: undefined, ...mudar };
    for (const [k, v] of Object.entries(novo)) if (v) p.set(k, String(v));
    return `/produtos${p.size ? `?${p}` : ""}`;
  };
  const genero = ehGenero(q.genero) ? q.genero : undefined;
  const nomeGenero = genero === "feminino" ? "Feminino" : genero === "masculino" ? "Masculino" : undefined;
  const titulo = (nomeGenero ? `${nomeGenero}${q.categoria ? ` · ${q.categoria}` : ""}` : null) ?? q.categoria ?? q.marca ?? (q.promo === "1" ? "Ofertas" : q.q ? `“${q.q}”` : "Todos os produtos");
  const filtrosAtivos = [nomeGenero, q.categoria, q.marca, q.tamanho && `Tam. ${q.tamanho}`, q.promo === "1" && "Em promoção"].filter(Boolean) as string[];

  const mostrarFarm = [q.categoria, q.marca].some((v) => v?.toLowerCase() === "farm") || genero === "feminino";

  return (
    <div className="space-y-6">
      {mostrarFarm ? (
        <a href={LINK_CLUBE_FARM} target="_blank" rel="noopener noreferrer" className="flex flex-wrap items-center justify-between gap-3 bg-[#ebebed] px-5 py-4 transition hover:bg-[#e0e0e3]">
          <span>
            <span className="block text-sm font-black uppercase tracking-wide">Clube Seleto Farm &amp; Feminino</span>
            <span className="block text-xs text-fraco">Entre no grupo do clube no WhatsApp.</span>
          </span>
          <span className="btn !px-4 !py-2 !text-xs">Entrar no clube</span>
        </a>
      ) : null}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="titulao text-4xl sm:text-6xl">{titulo}</h1>
          <p className="mt-1 text-sm text-fraco">{lista.length} produtos</p>
          {nomeGenero ? <p className="mt-1 max-w-xl text-xs text-fraco">Estamos identificando o gênero de cada produto: esta lista mostra os que já sabemos e pode estar incompleta. Veja também <Link href="/produtos" className="font-bold underline">todos os produtos</Link>.</p> : null}
        </div>
        <div className="flex flex-wrap gap-1.5 text-xs">
          {ORDENS.map(([v, r]) => (
            <Link key={v} href={href({ ordem: v === "relevancia" ? undefined : v })} className={`border px-3 py-2 font-bold ${ordem === v ? "border-texto bg-texto text-white" : "border-borda hover:border-texto"}`}>
              {r}
            </Link>
          ))}
        </div>
      </div>

      {filtrosAtivos.length ? (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {filtrosAtivos.map((f) => (
            <span key={f} className="bg-tenue px-3 py-1.5 font-bold">{f}</span>
          ))}
          <Link href="/produtos" className="font-bold underline">Limpar tudo</Link>
        </div>
      ) : null}

      <div className="grid gap-8 lg:grid-cols-[240px_1fr]">
        <aside className="space-y-1 text-sm">
          <Grupo titulo="Categoria" aberto>
            {categorias().map((c) => (
              <Opcao key={c.valor} ativo={q.categoria === c.valor} href={href({ categoria: q.categoria === c.valor ? undefined : c.valor })}>
                {c.valor} <span className="opacity-60">({c.n})</span>
              </Opcao>
            ))}
          </Grupo>
          <Grupo titulo="Gênero" aberto={Boolean(q.genero)}>
            {(["masculino", "feminino"] as const).map((g) => (
              <Opcao key={g} ativo={q.genero === g} href={href({ genero: q.genero === g ? undefined : g })}>
                {g === "feminino" ? "Feminino" : "Masculino"}
              </Opcao>
            ))}
          </Grupo>
          <Grupo titulo="Marca" aberto={Boolean(q.marca)}>
            {marcas().slice(0, 16).map((m) => (
              <Opcao key={m.valor} ativo={q.marca === m.valor} href={href({ marca: q.marca === m.valor ? undefined : m.valor })}>
                {m.valor} <span className="opacity-60">({m.n})</span>
              </Opcao>
            ))}
          </Grupo>
          <Grupo titulo="Tamanho" aberto={Boolean(q.tamanho)}>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {tamanhosDisponiveis().slice(0, 30).map((t) => (
                <Link key={t} href={href({ tamanho: q.tamanho === t ? undefined : t })} className={`min-w-10 border px-2 py-2 text-center text-xs font-bold ${q.tamanho === t ? "border-texto bg-texto text-white" : "border-borda hover:border-texto"}`}>
                  {t}
                </Link>
              ))}
            </div>
          </Grupo>
          <Grupo titulo="Oferta" aberto={q.promo === "1"}>
            <Opcao ativo={q.promo === "1"} href={href({ promo: q.promo === "1" ? undefined : "1" })}>Só em promoção</Opcao>
          </Grupo>
        </aside>

        <section>
          {visiveis.length === 0 ? (
            <p className="bg-tenue p-10 text-center text-fraco">
              Nenhum produto encontrado. <Link href="/produtos" className="font-bold underline">Limpar filtros</Link>
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-x-3 gap-y-8 md:grid-cols-3 xl:grid-cols-4">
              {visiveis.map((p) => (
                <ProdutoCard key={p.ref} p={p} />
              ))}
            </div>
          )}

          {totalPaginas > 1 ? (
            <nav className="mt-10 flex items-center justify-center gap-4 text-sm">
              {pagina > 1 ? <Link className="btn-claro" href={href({ pagina: String(pagina - 1) })}>← Anterior</Link> : null}
              <span className="text-fraco">Página {pagina} de {totalPaginas}</span>
              {pagina < totalPaginas ? <Link className="btn-claro" href={href({ pagina: String(pagina + 1) })}>Próxima →</Link> : null}
            </nav>
          ) : null}
        </section>
      </div>
    </div>
  );
}

function Grupo({ titulo, aberto, children }: { titulo: string; aberto?: boolean; children: React.ReactNode }) {
  return (
    <details open={aberto} className="group border-b border-borda py-3">
      <summary className="flex cursor-pointer list-none items-center justify-between text-xs font-black uppercase tracking-[0.15em]">
        {titulo}
        <span className="text-lg transition group-open:rotate-45">+</span>
      </summary>
      <div className="mt-2 flex flex-col">{children}</div>
    </details>
  );
}
function Opcao({ ativo, href, children }: { ativo: boolean; href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className={`px-2 py-1.5 ${ativo ? "bg-texto font-bold text-white" : "hover:bg-tenue"}`}>
      {children}
    </Link>
  );
}
