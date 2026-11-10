import type { Metadata } from "next";
import Link from "next/link";
import { Fileira } from "@/components/Fileira";
import { MarcasEmDestaque } from "@/components/MarcasEmDestaque";
import { Hero, type Slide } from "@/components/Hero";
import { Reveal } from "@/components/Reveal";
import { LOJAS, LINK_AVALIACAO_GOOGLE, linkWhatsappGeral, telefoneGeral } from "@/lib/lojas";
import { jsonLd } from "@/lib/json-ld";
import { NOME_SITE, SITE_URL } from "@/lib/site";
import { clientesAtendidos } from "@/lib/vantagens";
import { buscar, categorias, fotoDaCategoria, garantirCatalogo, maiorDesconto, melhorOferta, novidades, promocoes, tenisEmOferta } from "@/lib/catalogo";

export const revalidate = 300; // acompanha o cache do catálogo (5 min)
export const metadata: Metadata = { alternates: { canonical: "/" } };

export default async function Home() {
  await garantirCatalogo();
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
  
  const tel = telefoneGeral();
  const loja = {
    "@context": "https://schema.org",
    "@type": "Store",
    name: NOME_SITE,
    url: SITE_URL,
    description: "Tênis, roupas e acessórios das melhores marcas, em 4 lojas no Rio de Janeiro e entrega para todo o Brasil.",
    ...(tel ? { telephone: `+${tel}` } : {}),
    areaServed: "BR",
  };

  return (
    <div className="space-y-14 pb-4 sm:space-y-20">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(loja) }} />
      <Hero slides={slides} />

      {/* benefícios: cartões em cinza suave com ícone, bem visíveis; o do WhatsApp abre a conversa quando o número está configurado */}
      <section className="mx-auto grid max-w-[1500px] grid-cols-2 gap-3 px-4 sm:grid-cols-4">
        {[
          { t: "Entrega para todo o Brasil", d: "Frete e prazo no pedido", href: "", icone: "M3 7h11v9H3zM14 10h4l3 3v3h-7zM7 19a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM17 19a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z" },
          { t: "Retire grátis na loja", d: "Sem fila, em 4 lojas", href: "/produtos", icone: "M4 9l1-5h14l1 5M4 9v11h16V9M4 9h16M9 20v-6h6v6" },
          { t: "Atendimento no WhatsApp", d: "Tire dúvidas antes de comprar", href: linkWhatsappGeral("Olá! Vim pelo site da Seleto.") ?? "", icone: "M21 11.5a8.4 8.4 0 0 1-12.4 7.4L3 21l2.1-5.4A8.4 8.4 0 1 1 21 11.5z" },
          { t: "Cashback Seleto", d: "Veja e use o seu saldo", href: "/conta", icone: "M12 2v20M17 6H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" },
        ].map(({ t, d, href, icone }) => {
          const miolo = (
            <>
              <span className="flex size-11 items-center justify-center rounded-full bg-destaque text-texto">
                <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={icone} /></svg>
              </span>
              <span className="mt-3 block text-sm font-black uppercase tracking-wide">{t}</span>
              <span className="mt-1 block text-xs text-fraco">{d}</span>
            </>
          );
          const base = "flex flex-col items-center bg-[#ebebed] px-4 py-6 text-center text-texto";
          if (!href) return <div key={t} className={base}>{miolo}</div>;
          const externo = href.startsWith("http");
          return externo ? (
            <a key={t} href={href} target="_blank" rel="noopener noreferrer" className={`${base} transition hover:-translate-y-0.5 hover:bg-[#e0e0e3]`}>{miolo}</a>
          ) : (
            <Link key={t} href={href} className={`${base} transition hover:-translate-y-0.5 hover:bg-[#e0e0e3]`}>{miolo}</Link>
          );
        })}
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
              <p className="mt-3 max-w-sm text-sm text-white/75">Entre na sua conta e veja quanto você tem, quando libera e quando vence.</p>
              <span className="mt-5 inline-block w-fit bg-white px-6 py-3 text-sm font-black uppercase text-texto transition group-hover:bg-destaque">Entrar na minha conta →</span>
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
          <Link href="/conta?aba=vantagens" className="group flex flex-col items-start justify-between gap-4 border-2 border-texto p-6 sm:flex-row sm:items-center sm:p-8">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.25em] text-fraco">Lista VIP</p>
              <h3 className="titulao mt-1 text-3xl sm:text-4xl">Ofertas e novidades<br className="hidden sm:block" /> antes de todo mundo</h3>
              <p className="mt-2 max-w-xl text-sm text-fraco">Quem está na lista VIP recebe as ofertas e os lançamentos da Seleto primeiro. Entre com seu CPF na área do cliente.</p>
            </div>
            <span className="shrink-0 bg-texto px-6 py-3 text-sm font-black uppercase text-white transition group-hover:bg-destaque group-hover:text-texto">Quero entrar →</span>
          </Link>
        </Reveal>

        <Reveal>
          <Fileira titulo="Novidades" href="/produtos?ordem=novo" produtos={buscar({ ordem: "novo" }).filter((p) => p.novo && p.foto).slice(0, 12)} />
        </Reveal>


        <Reveal>
          <ConfiancaDaLoja />
        </Reveal>
      </div>
    </div>
  );
}

/** Só fatos verificáveis: lojas reais e canais de contato configurados. Números de clientes só com o valor real informado. */
function ConfiancaDaLoja() {
  const zap = linkWhatsappGeral("Olá! Vim pelo site da Seleto.");
  const clientes = clientesAtendidos();
  return (
    <section className="grid gap-px bg-borda sm:grid-cols-3">
      <div className="bg-white p-6">
        <p className="titulao text-3xl">{LOJAS.length} lojas físicas</p>
        <p className="mt-1 text-sm text-fraco">{LOJAS.map((l) => l.nome).join(" · ")}. Retire grátis ou fale com a gente.</p>
      </div>
      <div className="bg-white p-6">
        <p className="titulao text-3xl">Atendimento humano</p>
        <p className="mt-1 text-sm text-fraco">
          {zap ? <a href={zap} target="_blank" rel="noopener noreferrer" className="font-bold text-texto underline underline-offset-4">Chame no WhatsApp</a> : "Atendimento pelo WhatsApp"}
          {" "}para tirar dúvidas de tamanho, estoque e entrega antes de comprar.
        </p>
      </div>
      <div className="bg-white p-6">
        <p className="titulao text-3xl">{clientes ? `+${clientes.toLocaleString("pt-BR")} clientes` : "Clientes Seleto"}</p>
        <p className="mt-1 text-sm text-fraco">
          {LINK_AVALIACAO_GOOGLE ? <a href={LINK_AVALIACAO_GOOGLE} target="_blank" rel="noopener noreferrer" className="font-bold text-texto underline underline-offset-4">Veja as avaliações no Google</a> : "Compre com quem tem endereço e atendimento de verdade."}
        </p>
      </div>
    </section>
  );
}
