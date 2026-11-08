"use client";

import { useEffect, useState } from "react";
import { LOJAS } from "./lojas";

/** Loja escolhida pelo cliente para retirar (fica só neste navegador). */
export const CHAVE_LOJA_PREFERIDA = "seleto-loja:loja-preferida";

const valida = (id: string | null): id is string => !!id && LOJAS.some((l) => String(l.id) === id);

export function lerLojaPreferida(): string | null {
  try {
    const v = localStorage.getItem(CHAVE_LOJA_PREFERIDA);
    return valida(v) ? v : null;
  } catch {
    return null;
  }
}

/** `[id da loja ou null, trocar]`. Começa null (igual no servidor) e carrega do navegador depois de montar. */
export function useLojaPreferida(): [string | null, (id: string) => void] {
  const [id, setId] = useState<string | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- lê o localStorage só depois de montar, para não divergir do HTML do servidor
    setId(lerLojaPreferida());
  }, []);
  function trocar(novo: string) {
    if (!valida(novo)) return;
    setId(novo);
    try {
      localStorage.setItem(CHAVE_LOJA_PREFERIDA, novo);
    } catch {
      /* navegador sem armazenamento: só não lembra */
    }
  }
  return [id, trocar];
}
