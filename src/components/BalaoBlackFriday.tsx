"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const CHAVE = "seleto-loja:balao-bf-fechado";

/**
 * Faixa de Black Friday no topo do site, com o chamado em "balão". PRÉVIA: sem preço, desconto nem data inventados.
 * O cliente pode fechar (fica lembrado só neste navegador). Quem decide se aparece é o servidor (ver `blackFridayAtiva`).
 */
export function BalaoBlackFriday() {
  const [fechado, setFechado] = useState(true); // começa fechado para não "piscar" antes de ler o navegador

  useEffect(() => {
    let f = false;
    try {
      f = localStorage.getItem(CHAVE) === "1";
    } catch {
      /* sem armazenamento: mostra sempre */
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- lê o localStorage só depois de montar, para não divergir do HTML do servidor
    setFechado(f);
  }, []);

  if (fechado) return null;
  return (
    <div className="relative bg-texto text-white">
      <div className="mx-auto flex max-w-[1500px] flex-wrap items-center justify-center gap-x-4 gap-y-2 px-10 py-2.5 sm:py-3">
        {/* o "balão": caixa amarela com a pontinha para baixo */}
        <span className="relative inline-block rounded-xl bg-destaque px-3 py-1 text-xs font-black uppercase tracking-wider text-texto sm:text-sm">
          Black Friday
          <span aria-hidden className="absolute -bottom-1 left-4 size-2.5 rotate-45 bg-destaque" />
        </span>
        <p className="text-xs font-bold uppercase tracking-wide sm:text-sm">As melhores ofertas do ano estão chegando na Seleto</p>
        <Link href="/conta?aba=vantagens" className="text-xs font-black uppercase tracking-wide underline underline-offset-4 hover:text-destaque sm:text-sm">
          Entrar na lista VIP e receber primeiro →
        </Link>
      </div>
      <button
        type="button"
        aria-label="Fechar aviso de Black Friday"
        onClick={() => {
          setFechado(true);
          try {
            localStorage.setItem(CHAVE, "1");
          } catch {
            /* ignora */
          }
        }}
        className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 text-lg leading-none text-white/70 hover:text-white"
      >
        ×
      </button>
    </div>
  );
}
