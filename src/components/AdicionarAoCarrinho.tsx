"use client";

import { useState } from "react";
import Link from "next/link";
import { useCarrinho } from "@/lib/carrinho";
import type { Produto } from "@/lib/tipos";

export function AdicionarAoCarrinho({ p }: { p: Produto }) {
  const { adicionar } = useCarrinho();
  const [tamanho, setTamanho] = useState<string | null>(p.tamanhos.length === 1 ? p.tamanhos[0] : null);
  const [aviso, setAviso] = useState<"" | "falta" | "ok">("");

  function adicionarAgora() {
    if (!tamanho) return setAviso("falta");
    adicionar({ ref: p.ref, nome: p.nome, cor: p.cor, tamanho, preco: p.preco, foto: p.foto });
    setAviso("ok");
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="mb-2 text-sm font-semibold">Tamanho</p>
        <div className="flex flex-wrap gap-2">
          {p.tamanhos.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => {
                setTamanho(t);
                setAviso("");
              }}
              className={`min-w-11 rounded-md border px-3 py-2 text-sm ${tamanho === t ? "border-texto bg-texto text-white" : "border-borda bg-painel hover:border-texto"}`}
            >
              {t}
            </button>
          ))}
        </div>
        {aviso === "falta" ? <p className="mt-2 text-sm text-promo">Escolha um tamanho.</p> : null}
      </div>
      <button type="button" onClick={adicionarAgora} className="btn w-full sm:w-auto sm:min-w-64">
        Adicionar ao carrinho
      </button>
      {aviso === "ok" ? (
        <p className="text-sm text-ok">
          Adicionado! <Link href="/carrinho" className="font-semibold underline">Ver carrinho</Link>
        </p>
      ) : null}
    </div>
  );
}
