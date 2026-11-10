import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdicionarAoCarrinho } from "@/components/AdicionarAoCarrinho";
import { BlocoVantagensProduto } from "@/components/BlocoVantagensProduto";
import { Fileira } from "@/components/Fileira";
import { garantirCatalogo, produtoPorRef, relacionados } from "@/lib/catalogo";
import { reais } from "@/lib/format";
import { faixaCashback } from "@/lib/vantagens";
import { regrasCashback } from "@/lib/regras-servidor";
import { jsonLd } from "@/lib/json-ld";
import { NOME_SITE, SITE_URL } from "@/lib/site";

export const revalidate = 300; // acompanha o cache do catálogo (5 min)
export const generateStaticParams = async () => []; // páginas geradas no primeiro acesso e guardadas por 5 min

export async function generateMetadata({ params }: { params: Promise<{ ref: string }> }): Promise<Metadata> {
  const { ref } = await params;
  await garantirCatalogo();
  const p = produtoPorRef(ref);
  if (!p) return { title: "Produto não encontrado", robots: { index: false } };
  const descricao = `${p.nome}${p.cor ? ` — ${p.cor}` : ""} por ${reais(p.preco)}. ${p.marca} na Seleto: retire na loja ou receba em casa.`;
  const caminho = `/produto/${encodeURIComponent(p.ref)}`;
  return {
    title: `${p.nome} — ${p.marca}`,
    description: descricao,
    alternates: { canonical: caminho },
    openGraph: { type: "website", siteName: NOME_SITE, locale: "pt_BR", title: `${p.nome} — ${p.marca}`, description: descricao, url: caminho, ...(p.foto ? { images: [{ url: p.foto, alt: p.nome }] } : {}) },
    twitter: { card: p.foto ? "summary_large_image" : "summary", title: `${p.nome} — ${p.marca}`, description: descricao, ...(p.foto ? { images: [p.foto] } : {}) },
  };
}

export default async function ProdutoPage({ params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;
  await garantirCatalogo();
  const p = produtoPorRef(ref);
  if (!p) notFound();
  const desconto = p.precoDe ? Math.round(((p.precoDe - p.preco) / p.precoDe) * 100) : 0;
  const parecidos = relacionados(p, 10);
  const regras = await regrasCashback();

  const dadosProduto = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.nome,
    sku: p.ref,
    brand: { "@type": "Brand", name: p.marca },
    category: p.categoria,
    ...(p.cor ? { color: p.cor } : {}),
    ...(p.foto ? { image: [p.foto] } : {}),
    offers: {
      "@type": "Offer",
      url: `${SITE_URL}/produto/${encodeURIComponent(p.ref)}`,
      priceCurrency: "BRL",
      price: p.preco.toFixed(2),
      availability: "https://schema.org/InStock",
      itemCondition: "https://schema.org/NewCondition",
    },
  };

  return (
    <div className="space-y-14">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(dadosProduto) }} />
      <nav className="text-xs text-fraco">
        <Link href="/" className="hover:underline">Início</Link> /{" "}
        <Link href={`/produtos?categoria=${encodeURIComponent(p.categoria)}`} className="hover:underline">{p.categoria}</Link> / <span className="text-texto">{p.nome}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_440px]">
        <div className="relative aspect-square bg-tenue lg:aspect-[5/4] lg:self-start">
          {p.foto ? (
            // eslint-disable-next-line @next/next/no-img-element -- fotos vêm do catálogo (domínio externo)
            <img src={p.foto} alt={p.nome} className="foto-produto size-full object-contain p-6" />
          ) : (
            <div className="flex size-full items-center justify-center text-fraco">sem foto</div>
          )}
          {desconto > 0 ? <span className="absolute left-0 top-5 bg-promo px-3 py-1.5 text-sm font-black text-white">-{desconto}%</span> : null}
        </div>

        <div className="space-y-6 lg:sticky lg:top-28 lg:self-start">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-fraco">{p.marca} · {p.categoria}</p>
            <h1 className="titulao mt-2 text-3xl sm:text-4xl">{p.nome}</h1>
            {p.cor ? <p className="mt-2 text-sm text-fraco">Cor: {p.cor}</p> : null}
          </div>
          <div>
            <p className="text-3xl font-black">
              {reais(p.preco)}
              {p.precoDe ? <span className="ml-3 text-base font-normal text-fraco line-through">{reais(p.precoDe)}</span> : null}
            </p>
            
          </div>

          <AdicionarAoCarrinho p={p} />

          <BlocoVantagensProduto nome={p.nome} faixa={faixaCashback(p.preco, regras.ganhoMinPct, regras.ganhoMaxPct)} minPct={regras.ganhoMinPct} maxPct={regras.ganhoMaxPct} geraAgora={regras.geraAgora} />

          <div className="divide-y divide-borda border-y border-borda text-sm">
            <Info titulo="Entrega para todo o Brasil" aberto>
              Calculamos o frete e o prazo com você no pedido, pelo WhatsApp, antes de cobrar. Entregamos em todos os estados.
            </Info>
            <Info titulo="Retirada na loja">
              Retire sem fila em uma das nossas lojas: Américas, Aerotown, Nova Iguaçu ou Taquara. É grátis.
            </Info>
            <Info titulo="Trocas">
              A loja confirma a disponibilidade antes de separar o pedido.{" "}
              <Link href="/trocas" className="font-bold text-texto underline underline-offset-4">Veja como funcionam as trocas e devoluções.</Link>
            </Info>
          </div>
        </div>
      </div>

      {parecidos.length ? <Fileira titulo="Você também pode gostar" href={`/produtos?categoria=${encodeURIComponent(p.categoria)}`} produtos={parecidos} /> : null}
    </div>
  );
}

function Info({ titulo, aberto, children }: { titulo: string; aberto?: boolean; children: React.ReactNode }) {
  return (
    <details open={aberto} className="group py-3">
      <summary className="flex cursor-pointer list-none items-center justify-between font-bold">
        {titulo}
        <span className="text-lg transition group-open:rotate-45">+</span>
      </summary>
      <p className="mt-2 text-fraco">{children}</p>
    </details>
  );
}
