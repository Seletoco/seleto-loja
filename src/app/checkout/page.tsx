"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useCarrinho } from "@/lib/carrinho";
import { dataBr, digitos, reais } from "@/lib/format";
import { cpfValido, formatarCpf, soDigitos } from "@/lib/cpf";
import { LOJAS } from "@/lib/lojas";
import { MODO_REAL } from "@/lib/modo";
import { lerLojaPreferida } from "@/lib/loja-preferida";
import { formaDaEntrega } from "@/lib/pagamento";
import type { PedidoSalvo } from "@/lib/tipos";
import { situacaoDoCashback } from "@/lib/regra-cashback";
import { regraDeUsoDe, useRegrasCashback } from "@/lib/use-regras-cashback";
import type { RespostaConta } from "../api/conta/route";
import type { RespostaFrete } from "../api/frete/route";
import { cepValido } from "@/lib/frete";

export const CHAVE_PEDIDOS = "seleto-loja:pedidos";

/** Hoje em Brasília, AAAA-MM-DD. */
/** Número do pedido de exemplo (os 7 últimos dígitos do relógio). */
const post = (url: string, corpo: object) => fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(corpo) });
const novoNumeroDePedido = () => Number(String(Date.now()).slice(-7));

const hojeBr = () => new Date(Date.now() - 3 * 3_600_000).toISOString().slice(0, 10);

export default function Checkout() {
  const { itens, subtotal, pronto, limpar } = useCarrinho();
  const router = useRouter();
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");
  const [entrega, setEntrega] = useState<"retirada_loja" | "entrega_combinada">("retirada_loja");
  const [loja, setLoja] = useState<string>(() => (typeof window === "undefined" ? null : lerLojaPreferida()) ?? String(LOJAS[0].id));
  // Entrega para todo o Brasil: CEP -> endereço (ViaCEP) + frete (Correios, ou estimativa de exemplo).
  const [cep, setCep] = useState("");
  const [logradouro, setLogradouro] = useState("");
  const [numeroEnd, setNumeroEnd] = useState("");
  const [complemento, setComplemento] = useState("");
  const [bairro, setBairro] = useState("");
  const [cidade, setCidade] = useState("");
  const [uf, setUf] = useState("");
  const [cotacao, setCotacao] = useState<RespostaFrete | null>(null);
  const [servico, setServico] = useState<"PAC" | "SEDEX" | null>(null);
  const [calculando, setCalculando] = useState(false);
  const [erroFrete, setErroFrete] = useState("");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  // Cashback: o cliente confirma celular + 3 primeiros dígitos do CPF; o site mostra o que ele pode usar.
  const [cpf, setCpf] = useState("");
  const [consulta, setConsulta] = useState<{ para: string; dados: RespostaConta } | null>(null);
  const [consultando, setConsultando] = useState(false);
  const [erroCashback, setErroCashback] = useState("");
  const [usarCashback, setUsarCashback] = useState(false);
  const regras = useRegrasCashback();
  const regra = useMemo(() => regraDeUsoDe(regras), [regras]);

  const forma = formaDaEntrega(entrega);
  const desconto = useMemo(() => Math.round(subtotal * forma.descontoPct) / 100, [subtotal, forma]);

  const telefoneAtual = digitos(telefone).slice(-11);
  // A consulta é do CPF digitado: se ele mudar depois, o cashback some e é preciso consultar de novo.
  const dadosCashback = consulta && consulta.para === soDigitos(cpf) ? consulta.dados : null;
  const situacao = useMemo(
    () => (dadosCashback ? situacaoDoCashback(dadosCashback.cashbacks, subtotal, hojeBr(), regra) : null),
    [dadosCashback, subtotal, regra],
  );
  const cashbackAplicado = usarCashback && situacao ? Math.min(situacao.utilizavel, Math.max(0, Math.round((subtotal - desconto) * 100) / 100)) : 0;
  const opcaoEscolhida = cotacao?.opcoes.find((o) => o.servico === servico) ?? null;
  const frete = entrega === "entrega_combinada" && opcaoEscolhida ? opcaoEscolhida.valor : 0;
  const total = Math.max(0, Math.round((subtotal - desconto - cashbackAplicado + frete) * 100) / 100);

  // Quando o CEP fica completo (ou a sacola muda), busca o endereço e cota o frete.
  const chaveItens = itens.map((i) => `${i.ref}:${i.quantidade}`).join(",");
  const cepDigitos = digitos(cep);
  useEffect(() => {
    if (entrega !== "entrega_combinada" || !cepValido(cepDigitos) || !chaveItens) return;
    let cancelado = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- dispara a consulta ao completar o CEP
    setCalculando(true);
    setErro("");
    setErroFrete("");
    setCotacao(null);
    setServico(null);
    (async () => {
      try {
        const [fr, via] = await Promise.all([
          fetch("/api/frete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ cep: cepDigitos, itens: chaveItens.split(",").map((x) => ({ ref: x.split(":")[0], quantidade: Number(x.split(":")[1]) })) }),
          }),
          fetch(`https://viacep.com.br/ws/${cepDigitos}/json/`).then((r) => r.json()).catch(() => null),
        ]);
        const j = await fr.json();
        if (cancelado) return;
        if (!fr.ok) {
          setErroFrete(j.erro ?? "Não foi possível calcular o frete.");
        } else {
          setCotacao(j);
          setServico(j.opcoes?.[0]?.servico ?? null);
        }
        if (via && !via.erro) {
          setLogradouro((v) => v || via.logradouro || "");
          setBairro((v) => v || via.bairro || "");
          setCidade((v) => v || via.localidade || "");
          setUf((v) => v || via.uf || j.uf || "");
        } else if (fr.ok) {
          setUf((v) => v || j.uf || "");
        }
      } catch {
        if (!cancelado) setErroFrete("Sem conexão. Tente novamente.");
      } finally {
        if (!cancelado) setCalculando(false);
      }
    })();
    return () => {
      cancelado = true;
    };
  }, [entrega, cepDigitos, chaveItens]);

  async function verificarCashback() {
    setErroCashback("");
    if (!cpfValido(cpf)) return setErroCashback("CPF inválido. Confira os 11 números.");
    setConsultando(true);
    try {
      const r = await fetch("/api/conta", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ cpf }) });
      const j = await r.json();
      if (!r.ok) setErroCashback(j.erro ?? "Não foi possível consultar.");
      else {
        setConsulta({ para: soDigitos(cpf), dados: j });
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

  async function finalizar(e: React.FormEvent) {
    e.preventDefault();
    const tel = digitos(telefone);
    if (nome.trim().length < 3) return setErro("Informe seu nome completo.");
    if (tel.length < 10 || tel.length > 11) return setErro("Informe o celular com DDD.");
    if (entrega === "entrega_combinada") {
      if (!cepValido(cepDigitos)) return setErro("Informe o CEP para calcular o frete.");
      if (!opcaoEscolhida) return setErro("Escolha a forma de envio (PAC ou SEDEX).");
      if (logradouro.trim().length < 3 || !numeroEnd.trim() || cidade.trim().length < 2 || uf.trim().length !== 2) return setErro("Complete o endereço: rua, número, cidade e estado.");
    }
    // Com o banco ligado, o servidor grava em loja.pedidos (e recalcula preços e total). Sem banco, fica só neste navegador.
    if (enviando) return;
    const numero = novoNumeroDePedido();
    const pedido: PedidoSalvo = {
      numero,
      criadoEm: new Date().toISOString(),
      itens,
      cliente: { nome: nome.trim(), telefone: tel, email: email.trim() },
      entrega:
        entrega === "retirada_loja"
          ? { tipo: entrega, loja: LOJAS.find((l) => String(l.id) === loja)?.nome }
          : {
              tipo: entrega,
              endereco: `${logradouro.trim()}, ${numeroEnd.trim()}${complemento.trim() ? ` (${complemento.trim()})` : ""} — ${bairro.trim() ? bairro.trim() + ", " : ""}${cidade.trim()}/${uf.trim().toUpperCase()} — CEP ${cepDigitos}`,
              servico: opcaoEscolhida!.servico,
              prazoDias: opcaoEscolhida!.prazoDias,
              freteExemplo: opcaoEscolhida!.exemplo,
            },
      pagamento: { metodo: forma.id, rotulo: forma.rotulo },
      subtotal,
      cashback: cashbackAplicado > 0 ? { usado: cashbackAplicado, telefone: telefoneAtual } : undefined,
      frete,
      total,
      status: forma.id === "pagar_na_loja" ? "aguardando_retirada" : "aguardando_pagamento",
    };
    setEnviando(true);
    setErro("");
    try {
      const r = await post("/api/pedidos", {
        itens: itens.map((i) => ({ ref: i.ref, tamanho: i.tamanho, quantidade: i.quantidade })),
        cliente: pedido.cliente,
        entrega: pedido.entrega,
        frete: pedido.frete,
        cashback: pedido.cashback ?? null,
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        setErro(j.erro ?? "Não foi possível registrar o pedido. Tente novamente.");
        return;
      }
      if (typeof j.numero === "number") {
        // Pedido gravado no banco: vale o número e os valores que o servidor recalculou.
        pedido.numero = j.numero;
        pedido.subtotal = j.subtotal;
        pedido.frete = j.frete;
        pedido.total = j.total;
        pedido.cashback = j.cashbackUsado > 0 && pedido.cashback ? { ...pedido.cashback, usado: j.cashbackUsado } : undefined;
        pedido.status = "aguardando_pagamento";
      }
    } catch {
      setErro("Sem conexão. Seu pedido NÃO foi enviado. Tente novamente.");
      return;
    } finally {
      setEnviando(false);
    }
    const antigos = JSON.parse(localStorage.getItem(CHAVE_PEDIDOS) ?? "[]");
    localStorage.setItem(CHAVE_PEDIDOS, JSON.stringify([pedido, ...antigos]));
    limpar();
    router.push(`/pedido/${pedido.numero}`);
  }

  return (
    <form onSubmit={finalizar} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
      <div className="space-y-6">
        <h1 className="text-xl font-bold">Finalizar pedido</h1>

        <div className="grid items-start gap-6 xl:grid-cols-2">
        <div className="space-y-6">
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
          <Escolha ativo={entrega === "entrega_combinada"} onClick={() => setEntrega("entrega_combinada")} titulo="Entrega para todo o Brasil" texto="Digite o CEP e calculamos o frete pelos Correios." />
          {entrega === "entrega_combinada" ? (
            <div className="space-y-3">
              <div className="grid gap-2 sm:grid-cols-[180px_1fr]">
                <input className="campo" placeholder="CEP" inputMode="numeric" maxLength={9} value={cep} autoComplete="postal-code"
                  onChange={(e) => setCep(digitos(e.target.value).slice(0, 8).replace(/^(\d{5})(\d)/, "$1-$2"))} />
                <p className="self-center text-xs text-fraco">{calculando ? "Calculando o frete…" : "Digite o CEP e calculamos o frete na hora."}</p>
              </div>
              {erroFrete ? <p className="text-sm text-promo">{erroFrete}</p> : null}
              <div className="grid gap-2 sm:grid-cols-[1fr_110px]">
                <input className="campo" placeholder="Rua / Avenida" value={logradouro} onChange={(e) => setLogradouro(e.target.value)} autoComplete="address-line1" />
                <input className="campo" placeholder="Número" value={numeroEnd} onChange={(e) => setNumeroEnd(e.target.value)} />
              </div>
              <input className="campo" placeholder="Complemento (opcional)" value={complemento} onChange={(e) => setComplemento(e.target.value)} />
              <div className="grid gap-2 sm:grid-cols-[1fr_1fr_80px]">
                <input className="campo" placeholder="Bairro" value={bairro} onChange={(e) => setBairro(e.target.value)} />
                <input className="campo" placeholder="Cidade" value={cidade} onChange={(e) => setCidade(e.target.value)} />
                <input className="campo uppercase" placeholder="UF" maxLength={2} value={uf} onChange={(e) => setUf(e.target.value)} />
              </div>

              {cotacao ? (
                <div className="space-y-2">
                  <p className="text-xs font-bold uppercase tracking-wide text-fraco">Forma de envio</p>
                  {cotacao.opcoes.map((o) => (
                    <button
                      key={o.servico}
                      type="button"
                      onClick={() => { setServico(o.servico); setErro(""); }}
                      className={`flex w-full items-center justify-between border p-3 text-left ${servico === o.servico ? "border-texto bg-tenue" : "border-borda hover:border-texto"}`}
                    >
                      <span>
                        <span className="block text-sm font-semibold">{o.nome}</span>
                        <span className="block text-xs text-fraco">Chega em até {o.prazoDias} dias úteis{o.exemplo ? " (estimativa)" : ""}</span>
                      </span>
                      <span className="text-sm font-black">{reais(o.valor)}</span>
                    </button>
                  ))}
                  {cotacao.aviso ? <p className="text-xs text-fraco">{cotacao.aviso}</p> : null}
                </div>
              ) : null}
            </div>
          ) : null}
        </Secao>
        </div>

        <div className="space-y-6">
        <Secao titulo="3. Cashback (opcional)">
          {!dadosCashback ? (
            <>
              <p className="text-sm text-fraco">
                Tem cashback Seleto? Digite o seu CPF para ver se você é cliente e quanto pode usar neste pedido.
              </p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input className="campo sm:max-w-64" placeholder="Seu CPF" inputMode="numeric" maxLength={14} value={cpf} onChange={(e) => setCpf(formatarCpf(e.target.value))} autoComplete="off" />
                <button type="button" onClick={verificarCashback} disabled={consultando} className="btn-claro">
                  {consultando ? "Consultando…" : "Verificar meu cashback"}
                </button>
              </div>
              {erroCashback ? <p className="text-sm text-promo">{erroCashback}</p> : null}
              <p className="text-xs text-fraco">Seu CPF é usado só para a consulta e não fica guardado.{MODO_REAL ? "" : " Teste: 529.982.247-25."}</p>
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
                      Cobre até {regra.tetoPercentualDaCompra}% do valor da compra{regra.exemplo ? " (regra de reserva)" : ""}. A loja confirma o uso antes de separar o pedido.
                    </span>
                  </span>
                </label>
              )}
              <button type="button" onClick={() => { setConsulta(null); setCpf(""); setUsarCashback(false); }} className="text-xs text-fraco underline">
                Consultar outro CPF
              </button>
            </div>
          ) : null}
        </Secao>

        <Secao titulo="4. Pagamento">
          <Escolha ativo onClick={() => {}} titulo={forma.rotulo} texto={forma.descricao} />
          <p className="text-xs text-fraco">Nenhuma cobrança é feita pelo site.</p>
        </Secao>
        </div>
        </div>
      </div>

      <aside className="h-fit space-y-3 rounded-lg border border-borda bg-painel p-4 lg:sticky lg:top-28">
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
        <Linha rotulo={opcaoEscolhida ? `Frete ${opcaoEscolhida.nome}` : "Entrega"} valor={entrega === "retirada_loja" ? "Grátis (retirada)" : opcaoEscolhida ? reais(opcaoEscolhida.valor) : "Informe o CEP"} />
        <div className="flex justify-between text-lg font-black"><span>Total</span><span>{reais(total)}</span></div>
        {erro ? <p className="text-sm text-promo">{erro}</p> : null}
        <button type="submit" className="btn w-full" disabled={enviando}>{enviando ? "Enviando…" : "Fazer pedido"}</button>
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
