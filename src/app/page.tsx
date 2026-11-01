import Link from "next/link";
import { ProdutoCard } from "@/components/ProdutoCard";
import { Carrossel } from "@/components/Carrossel";
import { FaixaEntrega } from "@/components/FaixaEntrega";
import { categorias, destaques, novidades, promocoes } from "@/lib/catalogo";

export default function Home() {
  const cats = categorias().filter((c) => c.valor !== "Outros").slice(0, 8);
  return (
    <div className="space-y-10">
      <FaixaEntrega />
      <Carrossel produtos={destaques(5)} />

      <section>
        <h2 className="mb-3 text-lg font-bold">Categorias</h2>
        <div className="flex flex-wrap gap-2">
          {cats.map((c) => (
            <Link key={c.valor} href={`/produtos?categoria=${encodeURIComponent(c.valor)}`} className="btn-claro">
              {c.valor} <span className="ml-2 text-xs font-normal text-fraco">{c.n}</span>
            </Link>
          ))}
        </div>
      </section>

      <Vitrine titulo="Em promoção" href="/produtos?promo=1&ordem=promo" produtos={promocoes(8)} />
      <Vitrine titulo="Novidades" href="/produtos?ordem=novo" produtos={novidades(8)} />
    </div>
  );
}

function Vitrine({ titulo, href, produtos }: { titulo: string; href: string; produtos: ReturnType<typeof promocoes> }) {
  return (
    <section>
      <div className="mb-3 flex items-end justify-between">
        <h2 className="text-lg font-bold">{titulo}</h2>
        <Link href={href} className="text-sm font-medium underline">
          Ver todos
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {produtos.map((p) => (
          <ProdutoCard key={p.ref} p={p} />
        ))}
      </div>
    </section>
  );
}
