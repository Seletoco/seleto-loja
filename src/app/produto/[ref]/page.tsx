import Link from "next/link";
import { notFound } from "next/navigation";
import { AdicionarAoCarrinho } from "@/components/AdicionarAoCarrinho";
import { BlocoVantagensProduto } from "@/components/BlocoVantagensProduto";
import { Fileira } from "@/components/Fileira";
import { produtoPorRef, relacionados } from "@/lib/catalogo";
import { reais } from "@/lib/format";
import { cashbackGanho, percentualCashbackGanho } from "@/lib/vantagens";

export default async function ProdutoPage({ params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;
  const p = produtoPorRef(ref);
  if (!p) notFound();
  const desconto = p.precoDe ? Math.round(((p.precoDe - p.preco) / p.precoDe) * 100) : 0;
  const parcela = Math.round((p.preco / 6) * 100) / 100;
  const parecidos = relacionados(p, 10);

  return (
    <div className="space-y-14">
      <nav className="text-xs text-fraco">
        <Link href="/" className="hover:underline">Início</Link> /{" "}
        <Link href={`/produtos?categoria=${encodeURIComponent(p.categoria)}`} className="hover:underline">{p.categoria}</Link> / <span className="text-texto">{p.nome}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-[1fr_440px]">
        <div className="relative aspect-square bg-tenue lg:aspect-[5/4]">
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
            <p className="mt-1 text-sm text-fraco">ou 6x de {reais(parcela)} sem juros (exemplo) · Pix com 5% off</p>
          </div>

          <AdicionarAoCarrinho p={p} />

          <BlocoVantagensProduto nome={p.nome} ganho={cashbackGanho(p.preco)} percentual={percentualCashbackGanho()} />

          <div className="divide-y divide-borda border-y border-borda text-sm">
            <Info titulo="Entrega para todo o Brasil" aberto>
              Calculamos o frete e o prazo com você no pedido, pelo WhatsApp, antes de cobrar. Entregamos em todos os estados.
            </Info>
            <Info titulo="Retirada na loja">
              Retire sem fila em uma das nossas lojas: Américas, Aerotown, Nova Iguaçu ou Taquara. É grátis.
            </Info>
            <Info titulo="Trocas">
              A loja confirma a disponibilidade antes de separar o pedido. Trocas nas lojas (política a revisar).
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
