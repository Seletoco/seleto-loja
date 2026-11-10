"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useCarrinho } from "@/lib/carrinho";
import { LOJAS } from "@/lib/lojas";
import { useLojaPreferida } from "@/lib/loja-preferida";
import { reais } from "@/lib/format";
import type { PedidoSalvo, Produto } from "@/lib/tipos";

const CHAVE_PEDIDOS = "seleto-loja:pedidos"; // mesma chave do checkout

type Perfil = { logado: false } | { logado: true; ligada: boolean; nome?: string; telefone?: string | null };

export function AdicionarAoCarrinho({ p }: { p: Produto }) {
  const { adicionar } = useCarrinho();
  const router = useRouter();
  const [tamanho, setTamanho] = useState<string | null>(p.tamanhos.length === 1 ? p.tamanhos[0] : null);
  const [falta, setFalta] = useState(false);

  // Compra com 1 clique: só para conta ligada ao cadastro (o servidor confere de novo).
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [lojaId, trocarLoja] = useLojaPreferida();
  const [confirmando, setConfirmando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erroRapido, setErroRapido] = useState("");

  useEffect(() => {
    let vivo = true;
    fetch("/api/conta/perfil")
      .then((r) => r.json())
      .then((j) => vivo && setPerfil(j.logado ? { logado: true, ligada: Boolean(j.ligada), nome: j.nome, telefone: j.telefone } : { logado: false }))
      .catch(() => vivo && setPerfil({ logado: false }));
    return () => {
      vivo = false;
    };
  }, []);

  function adicionarAgora() {
    if (!tamanho) return setFalta(true);
    adicionar({ ref: p.ref, nome: p.nome, cor: p.cor, tamanho, preco: p.preco, foto: p.foto });
  }

  function abrirUmClique() {
    if (!tamanho) return setFalta(true);
    setErroRapido("");
    setConfirmando(true);
  }

  async function comprarUmClique() {
    if (!tamanho || !lojaId) return setErroRapido("Escolha a loja para retirar.");
    setEnviando(true);
    setErroRapido("");
    try {
      const r = await fetch("/api/pedidos/rapido", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ref: p.ref, tamanho, lojaId: Number(lojaId) }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        setErroRapido(j.erro ?? "Não foi possível comprar agora.");
        return;
      }
      // Guarda uma cópia no navegador para a tela de confirmação (o pedido de verdade está no banco).
      const pedido: PedidoSalvo = {
        numero: j.numero,
        criadoEm: new Date().toISOString(),
        itens: (j.itens as { ref: string; nome: string; cor: string; tamanho: string; quantidade: number; preco: number }[]).map((i) => ({ ...i, foto: p.foto })),
        cliente: { nome: j.nome, telefone: j.telefone, email: j.email ?? "" },
        entrega: { tipo: "retirada_loja", loja: j.loja },
        pagamento: { metodo: j.pagamento, rotulo: "Pagar na retirada" },
        subtotal: j.subtotal,
        frete: 0,
        total: j.total,
        status: "aguardando_pagamento",
      };
      try {
        const antigos = JSON.parse(localStorage.getItem(CHAVE_PEDIDOS) ?? "[]");
        localStorage.setItem(CHAVE_PEDIDOS, JSON.stringify([pedido, ...antigos]));
      } catch {
        /* sem armazenamento: o pedido continua salvo no banco */
      }
      router.push(`/pedido/${j.numero}`);
    } catch {
      setErroRapido("Sem conexão. Seu pedido NÃO foi enviado. Tente novamente.");
    } finally {
      setEnviando(false);
    }
  }

  const ligada = perfil?.logado === true && perfil.ligada;
  const lojaNome = LOJAS.find((l) => String(l.id) === lojaId)?.nome;

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
      <div className="space-y-2">
        <button type="button" onClick={adicionarAgora} className="btn w-full !py-4 text-base">
          Adicionar à sacola
        </button>
        {ligada ? (
          <button type="button" onClick={abrirUmClique} className="btn-claro w-full !py-4 text-base">
            Comprar com 1 clique
          </button>
        ) : perfil ? (
          <p className="text-center text-xs text-fraco">
            {perfil.logado ? "Ligue sua conta ao seu cadastro da Seleto para comprar com 1 clique." : "Tem conta Seleto? Entre para comprar com 1 clique."}{" "}
            <Link href={`/conta?voltar=${encodeURIComponent(`/produto/${p.ref}`)}`} className="font-bold text-texto underline underline-offset-4">
              {perfil.logado ? "Ligar meu cadastro" : "Entrar ou criar conta"}
            </Link>
          </p>
        ) : null}
      </div>

      {confirmando && ligada && perfil?.logado ? (
        <div className="space-y-3 border-2 border-texto p-4 text-sm" role="group" aria-label="Confirmar compra com 1 clique">
          <p className="font-black uppercase tracking-wide">Confirmar compra</p>
          <p>
            1× {p.nome} (tam. {tamanho}) — <b>{reais(p.preco)}</b>
          </p>
          <p className="text-fraco">
            Em nome de <b className="text-texto">{perfil.nome}</b>
            {perfil.telefone ? <>, contato com final <b className="text-texto">{perfil.telefone.slice(-4)}</b></> : null}. Retirada grátis; você paga na loja, ao retirar. A loja confirma a disponibilidade e avisa você.
          </p>
          <label className="block text-xs font-bold uppercase tracking-wide text-fraco" htmlFor="loja-rapida">Loja para retirar</label>
          <select id="loja-rapida" className="campo !mt-1" value={lojaId ?? ""} onChange={(e) => trocarLoja(e.target.value)}>
            <option value="" disabled>Escolha a loja</option>
            {LOJAS.map((l) => (
              <option key={l.id} value={l.id}>{l.nome}</option>
            ))}
          </select>
          {erroRapido ? <p className="text-promo" role="alert">{erroRapido}</p> : null}
          <div className="flex gap-2">
            <button type="button" onClick={comprarUmClique} disabled={enviando || !lojaNome} className="btn flex-1">{enviando ? "Enviando…" : "Confirmar compra"}</button>
            <button type="button" onClick={() => setConfirmando(false)} disabled={enviando} className="btn-claro">Cancelar</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
