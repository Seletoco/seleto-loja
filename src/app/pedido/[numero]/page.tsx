"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { reais, telefoneBonito } from "@/lib/format";
import type { PedidoSalvo } from "@/lib/tipos";

const CHAVE_PEDIDOS = "seleto-loja:pedidos";

export default function PedidoPage({ params }: { params: Promise<{ numero: string }> }) {
  const { numero } = use(params);
  const [pedido, setPedido] = useState<PedidoSalvo | null | undefined>(undefined);

  useEffect(() => {
    try {
      const todos: PedidoSalvo[] = JSON.parse(localStorage.getItem(CHAVE_PEDIDOS) ?? "[]");
      // eslint-disable-next-line react-hooks/set-state-in-effect -- leitura única do localStorage
      setPedido(todos.find((p) => String(p.numero) === numero) ?? null);
    } catch {
      setPedido(null);
    }
  }, [numero]);

  if (pedido === undefined) return <p className="text-fraco">Carregando…</p>;
  if (pedido === null) {
    return (
      <div className="rounded-xl border border-borda bg-painel p-10 text-center">
        <p className="font-semibold">Pedido não encontrado neste navegador.</p>
        <Link href="/" className="btn mt-4">Voltar à loja</Link>
      </div>
    );
  }
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="rounded-xl border border-borda bg-painel p-6 text-center">
        <p className="text-sm font-semibold text-ok">Pedido recebido (teste)</p>
        <h1 className="mt-1 text-3xl font-black">Nº {pedido.numero}</h1>
        <p className="mt-2 text-sm text-fraco">
          Status: <strong>{pedido.status.replaceAll("_", " ")}</strong>. Em produção, a loja confirma a disponibilidade e avisa você pelo WhatsApp.
        </p>
      </div>
      <section className="space-y-2 rounded-lg border border-borda bg-painel p-4 text-sm">
        <p><strong>Cliente:</strong> {pedido.cliente.nome} · {telefoneBonito(pedido.cliente.telefone)}</p>
        <p>
          <strong>Entrega:</strong>{" "}
          {pedido.entrega.tipo === "retirada_loja" ? `Retirar na loja ${pedido.entrega.loja}` : `Entrega ${pedido.entrega.servico ?? ""} (até ${pedido.entrega.prazoDias ?? "—"} dias úteis) — ${pedido.entrega.endereco}`}
        </p>
        <p><strong>Pagamento:</strong> {pedido.pagamento.rotulo} (exemplo, sem cobrança)</p>
      </section>
      <section className="rounded-lg border border-borda bg-painel p-4">
        <ul className="divide-y divide-borda text-sm">
          {pedido.itens.map((i) => (
            <li key={i.ref + i.tamanho} className="flex justify-between gap-2 py-2">
              <span>{i.quantidade}× {i.nome} — tam. {i.tamanho}</span>
              <span>{reais(i.preco * i.quantidade)}</span>
            </li>
          ))}
        </ul>
        {pedido.frete > 0 ? (
          <p className="mt-2 flex justify-between text-sm"><span>Frete {pedido.entrega.servico}{pedido.entrega.freteExemplo ? " (estimativa, a loja confirma)" : ""}</span><span>{reais(pedido.frete)}</span></p>
        ) : null}
        {pedido.cashback ? (
          <p className="mt-2 flex justify-between text-sm"><span>Cashback utilizado (a loja confirma)</span><span>- {reais(pedido.cashback.usado)}</span></p>
        ) : null}
        <div className="mt-3 flex justify-between text-lg font-black"><span>Total</span><span>{reais(pedido.total)}</span></div>
      </section>
      <Link href="/produtos" className="btn-claro w-full">Continuar comprando</Link>
    </div>
  );
}
