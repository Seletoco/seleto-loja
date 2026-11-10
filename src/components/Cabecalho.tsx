"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { BalaoBlackFriday } from "./BalaoBlackFriday";
import { useCarrinho } from "@/lib/carrinho";
import type { DadosMenu } from "@/lib/catalogo";
import { reais } from "@/lib/format";

const q = (v: string) => encodeURIComponent(v);

export function Cabecalho({ menu, teste, blackFriday = false }: { menu: DadosMenu; teste: boolean; blackFriday?: boolean }) {
  const { quantidade, pronto, abrir } = useCarrinho();
  const [mobile, setMobile] = useState(false);
  const [busca, setBusca] = useState(false);
  const [aberto, setAberto] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rota = usePathname();

  // Menu aberto ao passar o mouse, com uma pequena folga antes de fechar: dá tempo de ir do item até o painel sem ele sumir.
  const abrirMenu = (id: string) => {
    if (timer.current) clearTimeout(timer.current);
    setAberto(id);
  };
  const fecharMenu = (atraso = 220) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setAberto(null), atraso);
  };
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fecha o painel ao trocar de página
    setAberto(null);
  }, [rota]);
  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => e.key === "Escape" && setAberto(null);
    window.addEventListener("keydown", aoTeclar);
    return () => {
      window.removeEventListener("keydown", aoTeclar);
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const k = (c: string) => encodeURIComponent(c);
  const paineis: Record<string, React.ReactNode> = {
    novidades: (
      <Colunas titulo="Novidades" itens={[["Todos os lançamentos", "/produtos?ordem=novo"], ["Tênis novos", `/produtos?categoria=${k("Tênis")}&ordem=novo`], ...menu.roupas.map((c): string[] => [`Novidades em ${c}`, `/produtos?categoria=${k(c)}&ordem=novo`])]} menu={menu} produtos={menu.novos} />
    ),
    tenis: (
      <Colunas titulo="Tênis" itens={[["Todos os tênis", `/produtos?categoria=${k("Tênis")}`], ...menu.marcas.map((m): string[] => [m, `/produtos?categoria=${k("Tênis")}&marca=${k(m)}`])]} menu={menu} duas />
    ),
    roupas: <Colunas titulo="Roupas" itens={menu.roupas.map((c) => [c, `/produtos?categoria=${k(c)}`])} menu={menu} />,
    acessorios: <Colunas titulo="Acessórios" itens={menu.acessorios.map((c) => [c, `/produtos?categoria=${k(c)}`])} menu={menu} />,
    marcas: <Colunas titulo="Marcas" itens={menu.marcas.map((m) => [m, `/produtos?marca=${k(m)}`])} menu={menu} duas />,
    ofertas: (
      <Colunas titulo="Ofertas" itens={[["Todas as ofertas", "/produtos?promo=1&ordem=promo"], ["Tênis em oferta", `/produtos?promo=1&categoria=${k("Tênis")}&ordem=promo`], ...menu.roupas.map((c): string[] => [`${c} em oferta`, `/produtos?promo=1&categoria=${k(c)}&ordem=promo`])]} menu={menu} />
    ),
  };

  return (
    <header className="sticky top-0 z-40 bg-white">
      {blackFriday ? <BalaoBlackFriday /> : null}
      {teste ? (
        <div className="bg-destaque px-4 py-1 text-center text-[11px] font-bold uppercase tracking-wide text-texto">
          Ambiente de teste — pedidos e pagamentos são só de exemplo
        </div>
      ) : null}
      <div className="relative border-b border-borda" onMouseEnter={() => timer.current && clearTimeout(timer.current)} onMouseLeave={() => fecharMenu()}>
        <div className="mx-auto flex h-16 max-w-[1500px] items-center gap-4 px-4">
          <button className="lg:hidden" onClick={() => setMobile(true)} aria-label="Menu">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M3 12h18M3 18h18" /></svg>
          </button>
          <Link href="/" className="titulao text-3xl tracking-[0.18em]">SELETO</Link>

          <nav className="ml-6 hidden h-full items-stretch gap-1 lg:flex" aria-label="Principal" onMouseLeave={() => fecharMenu()}>
            <Item id="novidades" href="/produtos?ordem=novo" aberto={aberto} abrir={abrirMenu}>Novidades</Item>
            <Item id="tenis" href={`/produtos?categoria=${q("Tênis")}`} aberto={aberto} abrir={abrirMenu}>Tênis</Item>
            <Item id="roupas" href="/produtos" aberto={aberto} abrir={abrirMenu}>Roupas</Item>
            <Item id="acessorios" href="/produtos" aberto={aberto} abrir={abrirMenu}>Acessórios</Item>
            <Item id="marcas" href="/produtos" aberto={aberto} abrir={abrirMenu}>Marcas</Item>
            <Item id="ofertas" href="/produtos?promo=1&ordem=promo" promo aberto={aberto} abrir={abrirMenu}>Ofertas</Item>
          </nav>

          <div className="ml-auto flex items-center gap-1">
            <button onClick={() => setBusca((v) => !v)} aria-label="Buscar" className="p-2.5 hover:bg-tenue">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></svg>
            </button>
            <Link href="/conta" aria-label="Meu cashback" className="flex items-center gap-2 p-2.5 text-sm font-bold hover:bg-tenue">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-6 8-6s8 2 8 6" /></svg>
              <span className="hidden xl:inline">Meu cashback</span>
            </Link>
            <button onClick={abrir} aria-label="Sacola" className="relative p-2.5 hover:bg-tenue">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 8h14l-1 12H6L5 8Z" /><path d="M9 8V6a3 3 0 0 1 6 0v2" /></svg>
              {pronto && quantidade > 0 ? (
                <span className="absolute right-0.5 top-0.5 flex size-5 items-center justify-center rounded-full bg-texto text-[11px] font-bold text-white">{quantidade}</span>
              ) : null}
            </button>
          </div>
        </div>

        {aberto && paineis[aberto] ? (
          <div className="absolute inset-x-0 top-full border-b border-borda bg-white shadow-xl" onMouseEnter={() => abrirMenu(aberto)}>
            {paineis[aberto]}
          </div>
        ) : null}

        {busca ? (
          <form action="/produtos" className="border-t border-borda bg-white">
            <div className="mx-auto flex max-w-[1500px] items-center gap-3 px-4 py-3">
              <input autoFocus name="q" className="campo !border-0 !border-b-2 !border-texto text-lg" placeholder="Buscar tênis, camiseta, marca…" aria-label="Buscar" />
              <button className="btn">Buscar</button>
              <button type="button" onClick={() => setBusca(false)} aria-label="Fechar busca" className="text-3xl leading-none">×</button>
            </div>
          </form>
        ) : null}
      </div>

      {mobile ? <MenuMobile menu={menu} fechar={() => setMobile(false)} /> : null}
    </header>
  );
}

function Item({ id, href, children, promo, aberto, abrir }: { id: string; href: string; children: React.ReactNode; promo?: boolean; aberto: string | null; abrir: (id: string) => void }) {
  return (
    <div className="flex items-stretch" onMouseEnter={() => abrir(id)}>
      <Link
        href={href}
        onFocus={() => abrir(id)}
        aria-expanded={aberto === id}
        className={`flex items-center border-b-2 px-3 text-sm font-bold uppercase tracking-wide ${aberto === id ? "border-texto" : "border-transparent"} ${promo ? "text-promo" : ""}`}
      >
        {children}
      </Link>
    </div>
  );
}

function Colunas({ titulo, itens, menu, duas, produtos }: { titulo: string; itens: string[][]; menu: DadosMenu; duas?: boolean; produtos?: DadosMenu["destaques"] }) {
  return (
    <div className="mx-auto grid max-w-[1500px] grid-cols-[1fr_auto] gap-10 px-8 py-8">
      <div>
        <p className="titulao mb-4 text-2xl">{titulo}</p>
        <ul className={`gap-x-12 gap-y-2 text-sm ${duas ? "grid grid-cols-3" : "space-y-2"}`}>
          {itens.map(([rotulo, href]) => (
            <li key={`${rotulo}${href}`}>
              <Link href={href} className="hover:underline">{rotulo}</Link>
            </li>
          ))}
          <li className="pt-2"><Link href={itens[0]?.[1] ?? "/produtos"} className="font-bold underline">Ver tudo</Link></li>
        </ul>
      </div>
      <div className="hidden gap-4 xl:flex">
        {(produtos ?? menu.destaques).map((p) => (
          <Link key={p.ref} href={`/produto/${p.ref}`} className="block w-44">
            <div className="aspect-square bg-tenue">
              {p.foto ? (
                // eslint-disable-next-line @next/next/no-img-element -- fotos vêm do catálogo
                <img src={p.foto} alt={p.nome} className="foto-produto size-full object-contain" />
              ) : null}
            </div>
            <p className="mt-2 line-clamp-1 text-xs font-bold">{p.nome}</p>
            <p className="text-xs text-promo">{reais(p.preco)}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

function MenuMobile({ menu, fechar }: { menu: DadosMenu; fechar: () => void }) {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-white">
      <div className="flex items-center justify-between border-b border-borda px-4 py-4">
        <span className="titulao text-3xl tracking-[0.18em]">SELETO</span>
        <button onClick={fechar} aria-label="Fechar" className="text-4xl leading-none">×</button>
      </div>
      <div className="px-4">
        <LinkMobile fechar={fechar} href="/produtos?ordem=novo">Novidades</LinkMobile>
        <LinkMobile fechar={fechar} href={`/produtos?categoria=${q("Tênis")}`}>Tênis</LinkMobile>
        {[...menu.roupas, ...menu.acessorios].map((c) => (
          <LinkMobile key={c} fechar={fechar} href={`/produtos?categoria=${q(c)}`}>{c}</LinkMobile>
        ))}
        <LinkMobile fechar={fechar} href="/produtos?promo=1&ordem=promo">Ofertas</LinkMobile>
        <LinkMobile fechar={fechar} href="/conta">Meu cashback</LinkMobile>
        <p className="pb-2 pt-6 text-xs font-bold uppercase tracking-wide text-fraco">Marcas</p>
        <div className="flex flex-wrap gap-2 pb-8">
          {menu.marcas.map((m) => (
            <Link key={m} href={`/produtos?marca=${q(m)}`} onClick={fechar} className="border border-borda px-3 py-2 text-sm font-bold">{m}</Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function LinkMobile({ href, fechar, children }: { href: string; fechar: () => void; children: React.ReactNode }) {
  return (
    <Link href={href} onClick={fechar} className="block border-b border-borda py-3.5 text-lg font-bold uppercase">{children}</Link>
  );
}
