"use client";

import Link from "next/link";
import { useCarrinho } from "@/lib/carrinho";

export function Cabecalho() {
  const { quantidade, pronto } = useCarrinho();
  return (
    <header className="sticky top-0 z-30 border-b border-borda bg-painel/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
        <Link href="/" className="text-xl font-black tracking-[0.25em]">
          SELETO
        </Link>
        <form action="/produtos" className="mx-2 hidden flex-1 sm:block">
          <input name="q" placeholder="Buscar tênis, camiseta, marca…" className="campo" aria-label="Buscar" />
        </form>
        <nav className="ml-auto flex items-center gap-4 text-sm font-medium">
          <Link href="/produtos" className="hidden hover:underline sm:inline">
            Produtos
          </Link>
          <Link href="/conta" className="hover:underline">
            Meu cashback
          </Link>
          <Link href="/carrinho" className="btn-claro relative !px-3 !py-2" aria-label="Carrinho">
            Carrinho
            {pronto && quantidade > 0 ? (
              <span className="ml-2 rounded-full bg-texto px-2 py-0.5 text-xs text-white">{quantidade}</span>
            ) : null}
          </Link>
        </nav>
      </div>
      <form action="/produtos" className="px-4 pb-3 sm:hidden">
        <input name="q" placeholder="Buscar…" className="campo" aria-label="Buscar" />
      </form>
    </header>
  );
}
