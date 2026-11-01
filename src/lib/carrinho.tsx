"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ItemCarrinho } from "./tipos";

const CHAVE = "seleto-loja:carrinho";

interface Ctx {
  itens: ItemCarrinho[];
  quantidade: number;
  subtotal: number;
  pronto: boolean;
  adicionar: (item: Omit<ItemCarrinho, "quantidade">, qtd?: number) => void;
  alterar: (ref: string, tamanho: string, qtd: number) => void;
  remover: (ref: string, tamanho: string) => void;
  limpar: () => void;
}

const CarrinhoCtx = createContext<Ctx | null>(null);

export function CarrinhoProvider({ children }: { children: React.ReactNode }) {
  const [itens, setItens] = useState<ItemCarrinho[]>([]);
  const [pronto, setPronto] = useState(false);

  // Lê depois da hidratação (nunca no estado inicial: o servidor não tem localStorage).
  useEffect(() => {
    try {
      const salvo = localStorage.getItem(CHAVE);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- sincronização única com o localStorage
      if (salvo) setItens(JSON.parse(salvo));
    } catch {
      /* carrinho corrompido: começa vazio */
    }
    setPronto(true);
  }, []);

  useEffect(() => {
    if (pronto) localStorage.setItem(CHAVE, JSON.stringify(itens));
  }, [itens, pronto]);

  const adicionar: Ctx["adicionar"] = useCallback((item, qtd = 1) => {
    setItens((atual) => {
      const i = atual.findIndex((x) => x.ref === item.ref && x.tamanho === item.tamanho);
      if (i < 0) return [...atual, { ...item, quantidade: qtd }];
      return atual.map((x, j) => (j === i ? { ...x, quantidade: Math.min(x.quantidade + qtd, 10) } : x));
    });
  }, []);
  const alterar: Ctx["alterar"] = useCallback((ref, tamanho, qtd) => {
    setItens((atual) =>
      atual.map((x) => (x.ref === ref && x.tamanho === tamanho ? { ...x, quantidade: Math.max(1, Math.min(qtd, 10)) } : x)),
    );
  }, []);
  const remover: Ctx["remover"] = useCallback((ref, tamanho) => {
    setItens((atual) => atual.filter((x) => !(x.ref === ref && x.tamanho === tamanho)));
  }, []);
  const limpar = useCallback(() => setItens([]), []);

  const valor = useMemo<Ctx>(
    () => ({
      itens,
      pronto,
      quantidade: itens.reduce((s, x) => s + x.quantidade, 0),
      subtotal: Math.round(itens.reduce((s, x) => s + x.preco * x.quantidade, 0) * 100) / 100,
      adicionar,
      alterar,
      remover,
      limpar,
    }),
    [itens, pronto, adicionar, alterar, remover, limpar],
  );
  return <CarrinhoCtx.Provider value={valor}>{children}</CarrinhoCtx.Provider>;
}

export function useCarrinho(): Ctx {
  const c = useContext(CarrinhoCtx);
  if (!c) throw new Error("useCarrinho fora do CarrinhoProvider");
  return c;
}
