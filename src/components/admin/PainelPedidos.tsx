"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ROTULO_STATUS } from "./Blocos";
import { reais, telefoneBonito } from "@/lib/format";
import type { PedidoSalvo } from "@/lib/tipos";

const CHAVE = "seleto-loja:pedidos";
const STATUS = ["aguardando_pagamento", "pago", "em_separacao", "pronto_retirada", "enviado", "entregue", "cancelado"];

/** `doBanco`: pedidos vindos de loja.pedidos (banco ligado). Sem ele, o painel mostra os pedidos de teste deste navegador. */
export function PainelPedidos({ doBanco, pixLigado = false, cartaoLigado = false }: { doBanco?: PedidoSalvo[]; pixLigado?: boolean; cartaoLigado?: boolean }) {
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
        <p className="text-xs text-fraco">Confirme o estoque, mude o status e, se o cliente for pagar online, gere o Pix no pedido.</p>
      ) : (
        <p className="text-xs text-fraco">Neste ambiente os pedidos ficam só no navegador. Ao ligar o banco, vêm da tabela <code>loja.pedidos</code>.</p>
      )}
      {aviso ? <p className="text-sm text-promo">{aviso}</p> : null}
      {pedidos.length === 0 ? (
        <p className="rounded-lg border border-borda bg-painel p-6 text-center text-fraco">Nenhum pedido ainda.</p>
      ) : (
        <div className="grid items-start gap-3 lg:grid-cols-2 2xl:grid-cols-3">
        {pedidos.map((p) => (
          <article key={p.numero} className="space-y-2 rounded-lg border border-borda bg-painel p-4 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <strong className="text-base">#{p.numero}</strong>
              <select className="campo !w-auto" value={p.status} onChange={(e) => mudar(p.numero, e.target.value)} aria-label="Status">
                {[...new Set([p.status, ...STATUS])].map((s) => (
                  <option key={s} value={s}>{ROTULO_STATUS[s] ?? s.replaceAll("_", " ")}</option>
                ))}
              </select>
            </div>
            <p className="text-xs text-fraco">{new Date(p.criadoEm).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</p>
            <p>{p.cliente.nome} · {telefoneBonito(p.cliente.telefone)}</p>
            {doBanco ? (
              <div className="flex flex-wrap gap-3 text-xs font-bold">
                <Link href={`/admin/pedidos/${p.numero}/separacao`} className="underline">Folha de separação</Link>
                {zapCliente(p) ? <a href={zapCliente(p)!} target="_blank" rel="noopener noreferrer" className="underline">WhatsApp do cliente</a> : null}
              </div>
            ) : null}
            <p className="text-fraco">
              {p.entrega.tipo === "retirada_loja" ? `Retirada: ${p.entrega.loja ?? "loja a definir"}` : `Entrega${p.entrega.servico ? ` ${p.entrega.servico}` : ""}${p.entrega.freteExemplo ? " (frete estimado, confirmar)" : ""}: ${p.entrega.endereco ?? "endereço a combinar"}`} · {p.pagamento.rotulo}
            </p>
            <ul className="text-fraco">
              {p.itens.map((i) => (
                <li key={i.ref + i.tamanho}>{i.quantidade}× {i.nome} (tam. {i.tamanho})</li>
              ))}
            </ul>
            {p.cashback ? <p className="text-promo">Cashback a confirmar e dar baixa: {reais(p.cashback.usado)} ({telefoneBonito(p.cashback.telefone)})</p> : null}
            <p className="font-bold">{reais(p.total)}</p>
            {doBanco ? <BlocoPix pedido={p} pixLigado={pixLigado} cartaoLigado={cartaoLigado} aoMudar={(c) => setPedidos((lista) => lista.map((x) => (x.numero === p.numero ? { ...x, cobranca: c, status: c.status === "pago" && x.status === "aguardando_pagamento" ? "pago" : x.status } : x)))} /> : null}
          </article>
        ))}
        </div>
      )}
    </section>
  );
}

const ROTULO_PIX: Record<string, string> = { pendente: "Pix gerado, aguardando pagamento", pago: "Pix PAGO", expirado: "Pix vencido", cancelado: "Pix cancelado ou devolvido", erro: "Pix com erro" };
const ROTULO_CARTAO: Record<string, string> = { pendente: "Link de cartão enviado, aguardando pagamento", pago: "Cartão PAGO", expirado: "Link de cartão vencido", cancelado: "Cartão cancelado ou devolvido", erro: "Cartão: pagamento NÃO confirmado, confira na Rede antes de cobrar de novo" };

/** Cobrança Pix do pedido: gerar, mandar o link ao cliente e conferir na Rede. */
function BlocoPix({ pedido, pixLigado, cartaoLigado, aoMudar }: { pedido: PedidoSalvo; pixLigado: boolean; cartaoLigado: boolean; aoMudar: (c: NonNullable<PedidoSalvo["cobranca"]>) => void }) {
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState("");
  const [copiado, setCopiado] = useState(false);
  const c = pedido.cobranca;
  const link = c && typeof window !== "undefined" ? `${window.location.origin}/pagar/${c.token}` : "";
  const fone = pedido.cliente.telefone.replace(/\D/g, "");
  const zap = link && fone.length >= 10 ? `https://wa.me/${fone.startsWith("55") ? fone : `55${fone}`}?text=${encodeURIComponent(`Olá, ${pedido.cliente.nome.split(" ")[0]}! Seu pedido ${pedido.numero} da Seleto está confirmado. Para pagar por ${pedido.cobranca?.metodo === "cartao" ? "cartão" : "Pix"} (${reais(pedido.total)}), use este link: ${link}`)}` : null;

  async function chamar(rota: string) {
    setOcupado(true);
    setErro("");
    try {
      const r = await fetch(rota, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ numero: pedido.numero }) });
      const j = (await r.json()) as { cobranca?: NonNullable<PedidoSalvo["cobranca"]>; erro?: string };
      if (j.cobranca) aoMudar(j.cobranca);
      else setErro(j.erro ?? "Não foi possível.");
    } catch {
      setErro("Sem conexão.");
    } finally {
      setOcupado(false);
    }
  }

  if (!c && !pixLigado && !cartaoLigado) return null;
  const ehCartao = c?.metodo === "cartao";
  const pago = c?.status === "pago";
  return (
    <div className="space-y-2 border-t border-borda pt-2">
      {c ? (
        <p className={`text-xs font-bold ${pago ? "text-ok" : "text-fraco"}`}>
          {(ehCartao ? ROTULO_CARTAO : ROTULO_PIX)[c.status] ?? c.status}
          {c.ambiente === "sandbox" ? " (teste)" : ""}
        </p>
      ) : null}
      {erro ? <p className="text-xs text-promo">{erro}</p> : null}
      <div className="flex flex-wrap gap-2">
        {!pago && pedido.status !== "cancelado" && pixLigado && (!c || c.status !== "pendente" || ehCartao) ? (
          <button className="btn-claro !px-3 !py-1.5 !text-xs" disabled={ocupado} onClick={() => chamar("/api/admin/pagamentos/pix")}>
            {ocupado ? "Gerando…" : "Gerar Pix"}
          </button>
        ) : null}
        {!pago && pedido.status !== "cancelado" && cartaoLigado && (!c || c.status !== "pendente" || !ehCartao) && c?.status !== "erro" ? (
          <button className="btn-claro !px-3 !py-1.5 !text-xs" disabled={ocupado} onClick={() => chamar("/api/admin/pagamentos/cartao")}>
            {ocupado ? "Gerando…" : "Gerar link de cartão"}
          </button>
        ) : null}
        {pago ? (
          <button
            className="btn-claro !px-3 !py-1.5 !text-xs"
            disabled={ocupado}
            onClick={async () => {
              if (!confirm(`Devolver ${reais(c!.valor)} ao cliente ${ehCartao ? "no cartão" : "pelo Pix"} e cancelar o pedido ${pedido.numero}? Não dá para desfazer.`)) return;
              setOcupado(true);
              setErro("");
              try {
                const r = await fetch("/api/admin/pagamentos/devolver", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ numero: pedido.numero }) });
                const j = (await r.json()) as { ok?: boolean; erro?: string };
                if (j.ok) aoMudar({ ...c!, status: "cancelado" });
                else setErro(j.erro ?? "Não foi possível devolver.");
              } catch {
                setErro("Sem conexão.");
              } finally {
                setOcupado(false);
              }
            }}
          >
            {ocupado ? "Devolvendo…" : ehCartao ? "Devolver no cartão" : "Devolver Pix"}
          </button>
        ) : null}
        {c?.status === "pendente" ? (
          <>
            <button
              className="btn-claro !px-3 !py-1.5 !text-xs"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(link);
                  setCopiado(true);
                  setTimeout(() => setCopiado(false), 2000);
                } catch {
                  /* sem permissão */
                }
              }}
            >
              {copiado ? "Link copiado" : "Copiar link"}
            </button>
            {zap ? <a className="btn-claro !px-3 !py-1.5 !text-xs" href={zap} target="_blank" rel="noopener noreferrer">Mandar no WhatsApp</a> : null}
            <button className="btn-claro !px-3 !py-1.5 !text-xs" disabled={ocupado} onClick={() => chamar("/api/admin/pagamentos/conferir")}>
              {ocupado ? "Conferindo…" : "Conferir pagamento"}
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
}

/** Conversa no WhatsApp com o cliente do pedido (número que ele informou no pedido). */
function zapCliente(p: PedidoSalvo): string | null {
  const fone = p.cliente.telefone.replace(/[^0-9]/g, "");
  if (fone.length < 10) return null;
  const texto = `Olá, ${p.cliente.nome.split(" ")[0]}! Aqui é da Seleto, sobre o seu pedido ${p.numero} pelo site.`;
  return `https://wa.me/${fone.startsWith("55") ? fone : `55${fone}`}?text=${encodeURIComponent(texto)}`;
}
