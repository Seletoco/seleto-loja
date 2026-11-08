"use client";

import { useEffect, useState } from "react";
import { reais, telefoneBonito } from "@/lib/format";
import type { PedidoSalvo } from "@/lib/tipos";

const CHAVE = "seleto-loja:pedidos";
const STATUS = ["aguardando_pagamento", "pago", "em_separacao", "pronto_retirada", "enviado", "entregue", "cancelado"];

/** `doBanco`: pedidos vindos de loja.pedidos (banco ligado). Sem ele, o painel mostra os pedidos de teste deste navegador. */
export function PainelPedidos({ doBanco }: { doBanco?: PedidoSalvo[] }) {
  const [pedidos, setPedidos] = useState<PedidoSalvo[]>(doBanco ?? []);
  const [aviso, setAviso] = useState("");

  useEffect(() => {
    if (doBanco) return;
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- leitura única do localStorage
      setPedidos(JSON.parse(localStorage.getItem(CHAVE) ?? "[]"));
    } catch {
      /* sem pedidos */
    }
  }, [doBanco]);

  async function mudar(numero: number, status: string) {
    const antes = pedidos;
    const novos = pedidos.map((p) => (p.numero === numero ? { ...p, status } : p));
    setPedidos(novos);
    if (!doBanco) return localStorage.setItem(CHAVE, JSON.stringify(novos));
    setAviso("");
    const r = await fetch("/api/admin/pedidos", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ numero, status }) }).catch(() => null);
    if (!r?.ok) {
      setPedidos(antes);
      setAviso("Não foi possível mudar o status. Atualize a página e tente de novo.");
    }
  }

  return (
    <section className="space-y-3">
      <h2 className="font-semibold">{doBanco ? "Pedidos" : "Pedidos (teste, deste navegador)"}</h2>
      {doBanco ? (
        <p className="text-xs text-fraco">Pedidos gravados no banco. O pagamento não é cobrado pelo site: a loja confirma e combina com o cliente.</p>
      ) : (
        <p className="text-xs text-fraco">Neste ambiente os pedidos ficam só no navegador. Ao ligar o banco, vêm da tabela <code>loja.pedidos</code>.</p>
      )}
      {aviso ? <p className="text-sm text-promo">{aviso}</p> : null}
      {pedidos.length === 0 ? (
        <p className="rounded-lg border border-borda bg-painel p-6 text-center text-fraco">Nenhum pedido ainda.</p>
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
              {p.entrega.tipo === "retirada_loja" ? `Retirada: ${p.entrega.loja}` : `Entrega ${p.entrega.servico ?? ""}${p.entrega.freteExemplo ? " (frete estimado — confirmar)" : ""}: ${p.entrega.endereco}`} · {p.pagamento.rotulo}
            </p>
            <ul className="text-fraco">
              {p.itens.map((i) => (
                <li key={i.ref + i.tamanho}>{i.quantidade}× {i.nome} (tam. {i.tamanho})</li>
              ))}
            </ul>
            {p.cashback ? <p className="text-promo">Cashback a confirmar e dar baixa: {reais(p.cashback.usado)} ({telefoneBonito(p.cashback.telefone)})</p> : null}
            <p className="font-bold">{reais(p.total)}</p>
          </article>
        ))
      )}
    </section>
  );
}
