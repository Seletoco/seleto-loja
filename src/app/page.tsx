import Link from "next/link";
import { Fileira } from "@/components/Fileira";
import { MarcasEmDestaque } from "@/components/MarcasEmDestaque";
import { Hero, type Slide } from "@/components/Hero";
import { Reveal } from "@/components/Reveal";
import { buscar, categorias, fotoDaCategoria, maiorDesconto, melhorOferta, novidades, promocoes, tenisEmOferta } from "@/lib/catalogo";

export default function Home() {
  const slides: Slide[] = [
    {
      etiqueta: "Entrega nacional",
      titulo: "ENTREGAMOS\nPARA TODO\nO BRASIL",
      texto: "Escolha no site e receba onde estiver. Frete e prazo confirmados no pedido. Ou retire em uma das nossas lojas.",
      cta: "Ver produtos",
      href: "/produtos",
      produto: null,
      fundo: "bg-[#111]",
      escuro: true,
    },
    {
      etiqueta: "Ofertas",
      titulo: `ATÉ\n${maiorDesconto()}% OFF`,
      texto: "Os maiores descontos da Seleto, nas melhores marcas, por tempo limitado.",
      cta: "Ver ofertas",
      href: "/produtos?promo=1&ordem=promo",
      produto: melhorOferta(),
      fundo: "bg-[#f1f1f1]",
    },
    {
      etiqueta: "Novidades",
      titulo: "CHEGOU\nAGORA",
      texto: "Lançamentos que acabaram de entrar no estoque das nossas lojas.",
      cta: "Ver novidades",
      href: "/produtos?ordem=novo",
      produto: novidades(1)[0] ?? null,
      fundo: "bg-destaque",
    },
    {
      etiqueta: "Tênis",
      titulo: "PISE\nFORTE",
      texto: "Os tênis mais desejados com preço de oferta. Escolha o seu número e leve hoje.",
      cta: "Ver tênis",
      href: "/produtos?categoria=T%C3%AAnis",
      produto: tenisEmOferta(),
      fundo: "bg-[#e6e6e6]",
    },
  ];

  const cats = categorias().filter((c) => !["Outros", "Farm"].includes(c.valor)).slice(0, 4);
  
  return (
    <div className="space-y-14 pb-4 sm:space-y-20">
      <Hero slides={slides} />

      {/* benefícios */}
      <section className="mx-auto grid max-w-[1500px] grid-cols-2 gap-px bg-borda px-0 sm:grid-cols-4">
        {[
          ["Entrega para todo o Brasil", "Frete e prazo no pedido"],
          ["Retire na loja", "Sem fila, em 4 lojas"],
          ["5% off no Pix", "Exemplo de condição"],
          ["Cashback Seleto", "Consulte seu saldo"],
        ].map(([t, d]) => (
          <div key={t} className="bg-white px-5 py-5 text-center">
            <p className="text-xs font-black uppercase tracking-wide">{t}</p>
            <p className="mt-1 text-xs text-fraco">{d}</p>
          </div>
        ))}
      </section>

      <div className="mx-auto max-w-[1500px] space-y-14 px-4 sm:space-y-20">
        <Reveal>
          <MarcasEmDestaque />
        </Reveal>

        <Reveal>
          <h2 className="titulao mb-4 text-3xl sm:text-4xl">Compre por categoria</h2>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {cats.map((c) => (
              <Link key={c.valor} href={`/produtos?categoria=${encodeURIComponent(c.valor)}`} className="group relative block aspect-[4/5] overflow-hidden bg-tenue">
                {fotoDaCategoria(c.valor) ? (
                  // eslint-disable-next-line @next/next/no-img-element -- fotos vêm do catálogo
                  <img src={fotoDaCategoria(c.valor)!} alt={c.valor} loading="lazy" className="foto-produto size-full object-contain p-6 transition duration-500 group-hover:scale-110" />
                ) : null}
                <span className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-white px-4 py-3">
                  <span className="titulao text-xl">{c.valor}</span>
                  <span className="text-xl transition group-hover:translate-x-1">→</span>
                </span>
              </Link>
            ))}
          </div>
        </Reveal>

        <Reveal>
          <Fileira titulo="Em promoção" href="/produtos?promo=1&ordem=promo" produtos={promocoes(12)} />
        </Reveal>

        <Reveal>
          <div className="grid gap-3 md:grid-cols-2">
            <Link href="/conta" className="group relative flex min-h-72 flex-col justify-end overflow-hidden bg-texto p-8 text-white">
              <span className="titulao absolute -right-4 -top-6 text-[9rem] text-white/10">R$</span>
              <p className="text-xs font-black uppercase tracking-[0.25em] text-destaque">Cashback Seleto</p>
              <h3 className="titulao mt-2 text-4xl sm:text-5xl">Seu dinheiro<br />de volta</h3>
              <p className="mt-3 max-w-sm text-sm text-white/75">Consulte quanto você tem, quando libera e quando vence. É só o celular e 3 dígitos do CPF.</p>
              <span className="mt-5 inline-block w-fit bg-white px-6 py-3 text-sm font-black uppercase text-texto transition group-hover:bg-destaque">Consultar meu saldo →</span>
            </Link>
            <Link href="/produtos?ordem=novo" className="group relative flex min-h-72 flex-col justify-end overflow-hidden bg-destaque p-8">
              <span className="titulao absolute -right-4 -top-6 text-[9rem] text-texto/10">NEW</span>
              <p className="text-xs font-black uppercase tracking-[0.25em]">Lançamentos</p>
              <h3 className="titulao mt-2 text-4xl sm:text-5xl">O que acabou<br />de chegar</h3>
              <p className="mt-3 max-w-sm text-sm text-texto/75">Peças novas entrando todo dia nas nossas lojas.</p>
              <span className="mt-5 inline-block w-fit bg-texto px-6 py-3 text-sm font-black uppercase text-white transition group-hover:bg-white group-hover:text-texto">Ver novidades →</span>
            </Link>
          </div>
        </Reveal>

        <Reveal>
          <Fileira titulo="Novidades" href="/produtos?ordem=novo" produtos={buscar({ ordem: "novo" }).filter((p) => p.novo && p.foto).slice(0, 12)} />
        </Reveal>

      </div>
    </div>
  );
}
