"use client";

import { useState } from "react";
import { useCarrinho } from "@/lib/carrinho";
import type { Produto } from "@/lib/tipos";

export function AdicionarAoCarrinho({ p }: { p: Produto }) {
  const { adicionar } = useCarrinho();
  const [tamanho, setTamanho] = useState<string | null>(p.tamanhos.length === 1 ? p.tamanhos[0] : null);
  const [falta, setFalta] = useState(false);

  function adicionarAgora() {
    if (!tamanho) return setFalta(true);
    adicionar({ ref: p.ref, nome: p.nome, cor: p.cor, tamanho, preco: p.preco, foto: p.foto });
  }

  return (
    <div className="space-y-5">
      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-black uppercase tracking-wide">Selecione o tamanho</p>
          {falta ? <p className="text-sm font-bold text-promo">Escolha um tamanho</p> : null}
        </div>
        <div className={`grid grid-cols-4 gap-2 sm:grid-cols-5 ${falta ? "outline outline-2 outline-promo" : ""}`}>
          {p.tamanhos.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => {
                setTamanho(t);
                setFalta(false);
              }}
              className={`border py-3 text-sm font-bold transition ${tamanho === t ? "border-texto bg-texto text-white" : "border-borda hover:border-texto"}`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>
      <button type="button" onClick={adicionarAgora} className="btn w-full !py-4 text-base">
        Adicionar à sacola
      </button>
    </div>
  );
}
