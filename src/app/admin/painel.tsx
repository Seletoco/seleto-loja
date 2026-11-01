"use client";

import { useEffect, useState } from "react";
import { reais, telefoneBonito } from "@/lib/format";
import type { PedidoSalvo } from "@/lib/tipos";

const CHAVE = "seleto-loja:pedidos";
const STATUS = ["aguardando_pagamento", "pago", "em_separacao", "pronto_retirada", "entregue", "cancelado"];

export function PainelPedidos() {
  const [pedidos, setPedidos] = useState<PedidoSalvo[]>([]);

  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- leitura única do localStorage
      setPedidos(JSON.parse(localStorage.getItem(CHAVE) ?? "[]"));
    } catch {
      /* sem pedidos */
    }
  }, []);

  function mudar(numero: number, status: string) {
    const novos = pedidos.map((p) => (p.numero === numero ? { ...p, status } : p));
    setPedidos(novos);
    localStorage.setItem(CHAVE, JSON.stringify(novos));
  }

  return (
    <section className="space-y-3">
      <h2 className="font-semibold">Pedidos (teste, deste navegador)</h2>
      <p className="text-xs text-fraco">
        Neste ambiente os pedidos ficam só no navegador. Ao ligar o banco, vêm da tabela <code>loja.pedidos</code>.
      </p>
      {pedidos.length === 0 ? (
        <p className="rounded-lg border border-borda bg-painel p-6 text-center text-fraco">Nenhum pedido ainda. Faça um pedido de teste na loja.</p>
      ) : (
        pedidos.map((p) => (
          <article key={p.numero} className="space-y-2 rounded-lg border border-borda bg-painel p-4 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <strong>Pedido {p.numero}</strong>
              <select className="campo !w-auto" value={p.status} onChange={(e) => mudar(p.numero, e.target.value)} aria-label="Status">
                {[...new Set([p.status, ...STATUS])].map((s) => (
                  <option key={s} value={s}>{s.replaceAll("_", " ")}</option>
                ))}
              </select>
            </div>
            <p>{p.cliente.nome} · {telefoneBonito(p.cliente.telefone)}</p>
            <p className="text-fraco">
              {p.entrega.tipo === "retirada_loja" ? `Retirada: ${p.entrega.loja}` : `Entrega: ${p.entrega.endereco}`} · {p.pagamento.rotulo}
            </p>
            <ul className="text-fraco">
              {p.itens.map((i) => (
                <li key={i.ref + i.tamanho}>{i.quantidade}× {i.nome} (tam. {i.tamanho})</li>
              ))}
            </ul>
            <p className="font-bold">{reais(p.total)}</p>
          </article>
        ))
      )}
    </section>
  );
}
