"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useCarrinho } from "@/lib/carrinho";
import { dataBr, digitos, reais } from "@/lib/format";
import { LOJAS } from "@/lib/lojas";
import { FORMAS_PAGAMENTO } from "@/lib/pagamento";
import type { PedidoSalvo } from "@/lib/tipos";
import { regraDeUso, situacaoDoCashback } from "@/lib/regra-cashback";
import type { RespostaConta } from "../api/conta/route";

export const CHAVE_PEDIDOS = "seleto-loja:pedidos";

/** Hoje em Brasília, AAAA-MM-DD. */
const hojeBr = () => new Date(Date.now() - 3 * 3_600_000).toISOString().slice(0, 10);

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

  // Cashback: o cliente confirma celular + 3 primeiros dígitos do CPF; o site mostra o que ele pode usar.
  const [cpf3, setCpf3] = useState("");
  const [consulta, setConsulta] = useState<{ para: string; dados: RespostaConta } | null>(null);
  const [consultando, setConsultando] = useState(false);
  const [erroCashback, setErroCashback] = useState("");
  const [usarCashback, setUsarCashback] = useState(false);
  const regra = regraDeUso();

  const forma = FORMAS_PAGAMENTO.find((f) => f.id === pagamento)!;
  const desconto = useMemo(() => Math.round(subtotal * forma.descontoPct) / 100, [subtotal, forma]);

  const telefoneAtual = digitos(telefone).slice(-11);
  // A consulta só vale para o celular consultado: mudou o número, o cashback some.
  const dadosCashback = consulta && consulta.para === telefoneAtual ? consulta.dados : null;
  const situacao = useMemo(
    () => (dadosCashback ? situacaoDoCashback(dadosCashback.cashbacks, subtotal, hojeBr(), regra) : null),
    [dadosCashback, subtotal, regra],
  );
  const cashbackAplicado = usarCashback && situacao ? Math.min(situacao.utilizavel, Math.max(0, Math.round((subtotal - desconto) * 100) / 100)) : 0;
  const total = Math.max(0, Math.round((subtotal - desconto - cashbackAplicado) * 100) / 100);

  async function verificarCashback() {
    setErroCashback("");
    if (telefoneAtual.length < 10) return setErroCashback("Preencha o celular com DDD nos seus dados, acima.");
    if (digitos(cpf3).length !== 3) return setErroCashback("Informe os 3 primeiros dígitos do CPF.");
    setConsultando(true);
    try {
      const r = await fetch("/api/conta", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ telefone: telefoneAtual, cpf: cpf3 }) });
      const j = await r.json();
      if (!r.ok) setErroCashback(j.erro ?? "Não foi possível consultar.");
      else {
        setConsulta({ para: telefoneAtual, dados: j });
        setUsarCashback(false);
      }
    } catch {
      setErroCashback("Sem conexão. Tente novamente.");
    } finally {
      setConsultando(false);
    }
  }

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
    if (entrega === "entrega_combinada" && endereco.trim().length < 8) return setErro("Informe o CEP e o endereço completo para a entrega.");
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
      cashback: cashbackAplicado > 0 ? { usado: cashbackAplicado, telefone: telefoneAtual } : undefined,
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
          <Escolha ativo={entrega === "entrega_combinada"} onClick={() => setEntrega("entrega_combinada")} titulo="Entrega para todo o Brasil" texto="Frete e prazo confirmados pela loja pelo WhatsApp antes de cobrar." />
          {entrega === "entrega_combinada" ? (
            <textarea className="campo" rows={3} placeholder="CEP, endereço completo, número, bairro, cidade e estado" value={endereco} onChange={(e) => setEndereco(e.target.value)} />
          ) : null}
        </Secao>

        <Secao titulo="3. Cashback (opcional)">
          {!dadosCashback ? (
            <>
              <p className="text-sm text-fraco">
                Tem cashback Seleto? Confirme o celular dos seus dados e os 3 primeiros dígitos do CPF para ver quanto você pode usar.
              </p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input className="campo sm:max-w-56" placeholder="3 primeiros dígitos do CPF" inputMode="numeric" maxLength={3} value={cpf3} onChange={(e) => setCpf3(e.target.value)} />
                <button type="button" onClick={verificarCashback} disabled={consultando} className="btn-claro">
                  {consultando ? "Consultando…" : "Verificar meu cashback"}
                </button>
              </div>
              {erroCashback ? <p className="text-sm text-promo">{erroCashback}</p> : null}
              <p className="text-xs text-fraco">Teste: celular 21 99999-9999 e CPF começando com 123.</p>
            </>
          ) : situacao && situacao.disponivel + situacao.aLiberar === 0 ? (
            <p className="text-sm text-fraco">Olá, {dadosCashback.nome}! Não encontramos cashback ativo neste celular.</p>
          ) : situacao ? (
            <div className="space-y-3">
              <p className="text-sm">Olá, <strong>{dadosCashback.nome}</strong>! Seu cashback:</p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className={`border p-3 ${situacao.disponivel > 0 ? "border-ok" : "border-borda"}`}>
                  <p className="text-xs text-fraco">Pode usar agora</p>
                  <p className="text-lg font-black">{reais(situacao.disponivel)}</p>
                </div>
                <div className="border border-borda p-3">
                  <p className="text-xs text-fraco">{situacao.proximaLiberacao ? `Libera em ${dataBr(situacao.proximaLiberacao)}` : "Libera em breve"}</p>
                  <p className="text-lg font-black">{reais(situacao.aLiberar)}</p>
                </div>
              </div>

              {situacao.disponivel === 0 ? (
                <p className="text-sm text-fraco">Você ainda não tem cashback liberado para usar. Ele fica disponível a partir da data indicada.</p>
              ) : situacao.bloqueadoPeloMinimo ? (
                <p className="border border-borda bg-tenue p-3 text-sm">
                  Seu cashback de <strong>{reais(situacao.disponivel)}</strong> é válido, mas só pode ser usado em compras a partir de{" "}
                  <strong>{reais(regra.compraMinima)}</strong>{regra.exemplo ? " (valor de exemplo)" : ""}. Faltam{" "}
                  <strong>{reais(situacao.faltaParaMinimo)}</strong> no seu pedido.
                </p>
              ) : (
                <label className="flex cursor-pointer items-start gap-3 border border-texto p-3 text-sm">
                  <input type="checkbox" className="mt-1 size-4" checked={usarCashback} onChange={(e) => setUsarCashback(e.target.checked)} />
                  <span>
                    <strong>Usar {reais(situacao.utilizavel)} de cashback neste pedido</strong>
                    <span className="block text-xs text-fraco">
                      Regra: compras a partir de {reais(regra.compraMinima)}{regra.exemplo ? " (exemplo)" : ""}. A loja confirma o uso antes de separar o pedido.
                    </span>
                  </span>
                </label>
              )}
              <button type="button" onClick={() => { setConsulta(null); setCpf3(""); setUsarCashback(false); }} className="text-xs text-fraco underline">
                Consultar outro celular
              </button>
            </div>
          ) : null}
        </Secao>

        <Secao titulo="4. Pagamento (exemplo)">
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
        {cashbackAplicado > 0 ? <Linha rotulo="Cashback" valor={`- ${reais(cashbackAplicado)}`} /> : null}
        <Linha rotulo="Entrega" valor={entrega === "retirada_loja" ? "Grátis (retirada)" : "Frete a confirmar"} />
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
