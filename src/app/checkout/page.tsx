"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useCarrinho } from "@/lib/carrinho";
import { digitos, reais } from "@/lib/format";
import { LOJAS } from "@/lib/lojas";
import { FORMAS_PAGAMENTO } from "@/lib/pagamento";
import type { PedidoSalvo } from "@/lib/tipos";

export const CHAVE_PEDIDOS = "seleto-loja:pedidos";

export default function Checkout() {
  const { itens, subtotal, pronto, limpar } = useCarrinho();
  const router = useRouter();
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");
  const [entrega, setEntrega] = useState<"retirada_loja" | "entrega_combinada">("retirada_loja");
  const [loja, setLoja] = useState<string>(String(LOJAS[0].id));
  const [endereco, setEndereco] = useState("");
  const [pagamento, setPagamento] = useState<(typeof FORMAS_PAGAMENTO)[number]["id"]>("pix");
  const [erro, setErro] = useState("");

  const forma = FORMAS_PAGAMENTO.find((f) => f.id === pagamento)!;
  const desconto = useMemo(() => Math.round(subtotal * forma.descontoPct) / 100, [subtotal, forma]);
  const total = Math.round((subtotal - desconto) * 100) / 100;

  if (!pronto) return <p className="text-fraco">Carregando…</p>;
  if (itens.length === 0) {
    return (
      <div className="rounded-xl border border-borda bg-painel p-10 text-center">
        <p className="font-semibold">Seu carrinho está vazio.</p>
        <Link href="/produtos" className="btn mt-4">Ver produtos</Link>
      </div>
    );
  }

  function finalizar(e: React.FormEvent) {
    e.preventDefault();
    const tel = digitos(telefone);
    if (nome.trim().length < 3) return setErro("Informe seu nome completo.");
    if (tel.length < 10 || tel.length > 11) return setErro("Informe o celular com DDD.");
    if (entrega === "entrega_combinada" && endereco.trim().length < 8) return setErro("Informe o endereço para combinarmos a entrega.");
    // Pedido de EXEMPLO: fica só neste navegador. Ao ligar o banco, grava em loja.pedidos.
    const numero = Number(String(Date.now()).slice(-7));
    const pedido: PedidoSalvo = {
      numero,
      criadoEm: new Date().toISOString(),
      itens,
      cliente: { nome: nome.trim(), telefone: tel, email: email.trim() },
      entrega:
        entrega === "retirada_loja"
          ? { tipo: entrega, loja: LOJAS.find((l) => String(l.id) === loja)?.nome }
          : { tipo: entrega, endereco: endereco.trim() },
      pagamento: { metodo: forma.id, rotulo: forma.rotulo },
      subtotal,
      frete: 0,
      total,
      status: forma.id === "pagar_na_loja" ? "aguardando_retirada" : "aguardando_pagamento",
    };
    const antigos = JSON.parse(localStorage.getItem(CHAVE_PEDIDOS) ?? "[]");
    localStorage.setItem(CHAVE_PEDIDOS, JSON.stringify([pedido, ...antigos]));
    limpar();
    router.push(`/pedido/${numero}`);
  }

  return (
    <form onSubmit={finalizar} className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <div className="space-y-6">
        <h1 className="text-xl font-bold">Finalizar pedido</h1>

        <Secao titulo="1. Seus dados">
          <input className="campo" placeholder="Nome completo" value={nome} onChange={(e) => setNome(e.target.value)} autoComplete="name" />
          <input className="campo" placeholder="Celular com DDD" inputMode="tel" value={telefone} onChange={(e) => setTelefone(e.target.value)} autoComplete="tel" />
          <input className="campo" placeholder="E-mail (opcional)" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        </Secao>

        <Secao titulo="2. Entrega">
          <Escolha ativo={entrega === "retirada_loja"} onClick={() => setEntrega("retirada_loja")} titulo="Retirar na loja" texto="Grátis. Avisamos quando estiver separado." />
          {entrega === "retirada_loja" ? (
            <select className="campo" value={loja} onChange={(e) => setLoja(e.target.value)} aria-label="Loja para retirada">
              {LOJAS.map((l) => (
                <option key={l.id} value={l.id}>{l.nome}</option>
              ))}
            </select>
          ) : null}
          <Escolha ativo={entrega === "entrega_combinada"} onClick={() => setEntrega("entrega_combinada")} titulo="Entrega combinada" texto="Combinamos valor e prazo pelo WhatsApp." />
          {entrega === "entrega_combinada" ? (
            <textarea className="campo" rows={3} placeholder="Endereço completo, com bairro e CEP" value={endereco} onChange={(e) => setEndereco(e.target.value)} />
          ) : null}
        </Secao>

        <Secao titulo="3. Pagamento (exemplo)">
          {FORMAS_PAGAMENTO.map((f) => (
            <Escolha
              key={f.id}
              ativo={pagamento === f.id}
              onClick={() => setPagamento(f.id)}
              titulo={f.rotulo + (f.descontoPct ? ` — ${f.descontoPct}% off` : "")}
              texto={f.descricao}
            />
          ))}
          <p className="text-xs text-fraco">Nenhuma cobrança é feita neste ambiente de teste.</p>
        </Secao>
      </div>

      <aside className="h-fit space-y-3 rounded-lg border border-borda bg-painel p-4">
        <h2 className="font-bold">Resumo</h2>
        <ul className="space-y-1 text-sm">
          {itens.map((i) => (
            <li key={i.ref + i.tamanho} className="flex justify-between gap-2">
              <span className="line-clamp-1">{i.quantidade}× {i.nome} ({i.tamanho})</span>
              <span>{reais(i.preco * i.quantidade)}</span>
            </li>
          ))}
        </ul>
        <hr className="border-borda" />
        <Linha rotulo="Subtotal" valor={reais(subtotal)} />
        {desconto > 0 ? <Linha rotulo={`Desconto ${forma.rotulo}`} valor={`- ${reais(desconto)}`} /> : null}
        <Linha rotulo="Entrega" valor="A combinar / grátis" />
        <div className="flex justify-between text-lg font-black"><span>Total</span><span>{reais(total)}</span></div>
        {erro ? <p className="text-sm text-promo">{erro}</p> : null}
        <button type="submit" className="btn w-full">Fazer pedido</button>
      </aside>
    </form>
  );
}

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3 rounded-lg border border-borda bg-painel p-4">
      <h2 className="font-semibold">{titulo}</h2>
      {children}
    </section>
  );
}
function Escolha({ ativo, onClick, titulo, texto }: { ativo: boolean; onClick: () => void; titulo: string; texto: string }) {
  return (
    <button type="button" onClick={onClick} className={`w-full rounded-md border p-3 text-left ${ativo ? "border-texto bg-tenue" : "border-borda hover:border-texto"}`}>
      <span className="block text-sm font-semibold">{titulo}</span>
      <span className="block text-xs text-fraco">{texto}</span>
    </button>
  );
}
const Linha = ({ rotulo, valor }: { rotulo: string; valor: string }) => (
  <div className="flex justify-between text-sm"><span>{rotulo}</span><span>{valor}</span></div>
);
