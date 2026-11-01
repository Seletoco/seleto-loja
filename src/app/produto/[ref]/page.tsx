import Link from "next/link";
import { notFound } from "next/navigation";
import { AdicionarAoCarrinho } from "@/components/AdicionarAoCarrinho";
import { ProdutoCard } from "@/components/ProdutoCard";
import { produtoPorRef, relacionados } from "@/lib/catalogo";
import { reais } from "@/lib/format";

export default async function ProdutoPage({ params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;
  const p = produtoPorRef(ref);
  if (!p) notFound();
  const desconto = p.precoDe ? Math.round(((p.precoDe - p.preco) / p.precoDe) * 100) : 0;
  const parcela = Math.round((p.preco / 6) * 100) / 100;

  return (
    <div className="space-y-10">
      <nav className="text-sm text-fraco">
        <Link href="/produtos" className="underline">Produtos</Link> /{" "}
        <Link href={`/produtos?categoria=${encodeURIComponent(p.categoria)}`} className="underline">{p.categoria}</Link>
      </nav>
      <div className="grid gap-8 md:grid-cols-2">
        <div className="relative aspect-square overflow-hidden rounded-xl border border-borda bg-painel">
          {p.foto ? (
            // eslint-disable-next-line @next/next/no-img-element -- fotos vêm do catálogo (domínio externo)
            <img src={p.foto} alt={p.nome} className="size-full object-contain p-4" />
          ) : (
            <div className="flex size-full items-center justify-center text-fraco">sem foto</div>
          )}
          {desconto > 0 ? (
            <span className="absolute left-3 top-3 rounded bg-promo px-2.5 py-1 text-sm font-bold text-white">-{desconto}%</span>
          ) : null}
        </div>
        <div className="space-y-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-fraco">{p.marca}</p>
            <h1 className="mt-1 text-2xl font-bold leading-tight">{p.nome}</h1>
            {p.cor ? <p className="mt-1 text-sm text-fraco">Cor: {p.cor}</p> : null}
          </div>
          <div>
            {p.precoDe ? <p className="text-sm text-fraco line-through">{reais(p.precoDe)}</p> : null}
            <p className="text-3xl font-black">{reais(p.preco)}</p>
            <p className="text-sm text-fraco">ou 6x de {reais(parcela)} sem juros (exemplo)</p>
          </div>
          <AdicionarAoCarrinho p={p} />
          <ul className="space-y-1 rounded-lg border border-borda bg-painel p-4 text-sm text-fraco">
            <li>Retire em qualquer loja Seleto, sem fila.</li>
            <li>A loja confirma a disponibilidade antes de separar o pedido.</li>
          </ul>
        </div>
      </div>
      {relacionados(p).length ? (
        <section>
          <h2 className="mb-3 text-lg font-bold">Você também pode gostar</h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {relacionados(p).map((r) => (
              <ProdutoCard key={r.ref} p={r} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
