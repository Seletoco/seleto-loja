"use client";

import Link from "next/link";
import { useRef } from "react";
import type { Produto } from "@/lib/tipos";
import { ProdutoCard } from "./ProdutoCard";

/** Fileira de produtos que desliza para o lado, com setas no desktop. */
export function Fileira({ titulo, href, produtos }: { titulo: string; href: string; produtos: Produto[] }) {
  const trilho = useRef<HTMLDivElement>(null);
  const mover = (dir: number) => trilho.current?.scrollBy({ left: dir * trilho.current.clientWidth * 0.8, behavior: "smooth" });
  return (
    <section>
      <div className="mb-4 flex items-end justify-between">
        <h2 className="titulao text-3xl sm:text-4xl">{titulo}</h2>
        <div className="flex items-center gap-2">
          <Link href={href} className="mr-2 text-sm font-bold underline">Ver tudo</Link>
          <button onClick={() => mover(-1)} aria-label="Anterior" className="hidden size-10 items-center justify-center border border-texto text-lg hover:bg-texto hover:text-white sm:flex">‹</button>
          <button onClick={() => mover(1)} aria-label="Próximo" className="hidden size-10 items-center justify-center border border-texto text-lg hover:bg-texto hover:text-white sm:flex">›</button>
        </div>
      </div>
      <div ref={trilho} className="sem-barra -mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-2">
        {produtos.map((p) => (
          <ProdutoCard key={p.ref} p={p} classe="w-[62%] shrink-0 snap-start sm:w-[34%] lg:w-[23.5%]" />
        ))}
      </div>
    </section>
  );
}
