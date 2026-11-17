"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useCarrinho } from "@/lib/carrinho";
import { LOJAS } from "@/lib/lojas";
import { useLojaPreferida } from "@/lib/loja-preferida";
import { cpfValido, formatarCpf } from "@/lib/cpf";
import { reais } from "@/lib/format";
import { cepValido } from "@/lib/frete";
import type { RespostaFrete } from "@/app/api/frete/route";
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
  // Formas de pagar na hora (só aparecem se a Rede estiver ligada) e a escolhida.
  const [online, setOnline] = useState<{ pix: boolean; cartao: boolean; teste: boolean }>({ pix: false, cartao: false, teste: false });
  const [forma, setForma] = useState<"loja" | "pix" | "cartao">("loja");
  // Onde receber: retirar na loja (grátis) ou em casa (CEP, frete e CPF para a nota fiscal).
  const [receber, setReceber] = useState<"loja" | "casa">("loja");
  const [cep, setCep] = useState("");
  const [rua, setRua] = useState("");
  const [numeroEnd, setNumeroEnd] = useState("");
  const [complemento, setComplemento] = useState("");
  const [bairro, setBairro] = useState("");
  const [cidade, setCidade] = useState("");
  const [uf, setUf] = useState("");
  const [cpf, setCpf] = useState("");
  const [cotacao, setCotacao] = useState<RespostaFrete | null>(null);
  const [servico, setServico] = useState<string | null>(null);
  const [erroFrete, setErroFrete] = useState("");
  const cepDigitos = cep.replace(/\D/g, "");

  // Em casa: ao completar o CEP, calcula o frete e preenche rua, bairro e cidade.
  useEffect(() => {
    if (receber !== "casa" || !cepValido(cepDigitos)) return;
    let cancelado = false;
    (async () => {
      try {
        const [fr, via] = await Promise.all([
          fetch("/api/frete", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ cep: cepDigitos, itens: [{ ref: p.ref, quantidade: 1 }] }) }),
          fetch(`/api/cep/${cepDigitos}`).then((r) => (r.ok ? r.json() : null)).catch(() => null),
        ]);
        const j = await fr.json();
        if (cancelado) return;
        setErroFrete(fr.ok ? "" : (j.erro ?? "Não foi possível calcular o frete."));
        setCotacao(fr.ok ? j : null);
        setServico(fr.ok ? (j.opcoes?.[0]?.servico ?? null) : null);
        if (via) {
          setRua((v) => v || via.logradouro || "");
          setBairro((v) => v || via.bairro || "");
          setCidade((v) => v || via.cidade || "");
          setUf((v) => v || via.uf || "");
        } else if (fr.ok) {
          setUf((v) => v || j.uf || "");
        }
      } catch {
        if (!cancelado) setErroFrete("Sem conexão. Tente novamente.");
      }
    })();
    return () => {
      cancelado = true;
    };
  }, [receber, cepDigitos, p.ref]);

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
    fetch("/api/pagamentos/opcoes", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { pix?: boolean; cartao?: boolean; teste?: boolean } | null) => {
        if (j) setOnline({ pix: Boolean(j.pix), cartao: Boolean(j.cartao), teste: Boolean(j.teste) });
      })
      .catch(() => {});
  }

  const opcaoFrete = receber === "casa" ? (cotacao?.opcoes.find((o) => o.servico === servico) ?? null) : null;
  const frete = opcaoFrete?.valor ?? 0;

  async function comprarUmClique() {
    if (!tamanho) return;
    if (receber === "loja" && !lojaId) return setErroRapido("Escolha a loja para retirar.");
    if (receber === "casa") {
      if (!cepValido(cepDigitos)) return setErroRapido("Informe o CEP para calcular o frete.");
      if (!opcaoFrete) return setErroRapido("Escolha a forma de envio.");
      if (rua.trim().length < 3 || !numeroEnd.trim() || cidade.trim().length < 2 || uf.trim().length !== 2) return setErroRapido("Complete o endereço: rua, número, cidade e estado.");
      if (!cpfValido(cpf)) return setErroRapido("Informe o seu CPF: ele é necessário para a nota fiscal da entrega.");
    }
    setEnviando(true);
    setErroRapido("");
    try {
      const r = await fetch("/api/pedidos/rapido", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
          ref: p.ref,
          tamanho,
          lojaId: Number(lojaId),
          pagamento: formaEfetiva === "loja" ? null : formaEfetiva,
          ...(receber === "casa"
            ? { receber, cpf, endereco: { cep: cepDigitos, logradouro: rua.trim(), numero: numeroEnd.trim(), complemento: complemento.trim(), bairro: bairro.trim(), cidade: cidade.trim(), uf: uf.trim().toUpperCase() }, servico: opcaoFrete!.nome, prazoDias: opcaoFrete!.prazoDias, frete: opcaoFrete!.valor, freteExemplo: opcaoFrete!.exemplo, assinaturaFrete: opcaoFrete!.assinatura }
            : { receber }),
        }),
      });
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
        entrega:
          receber === "casa" && opcaoFrete
            ? { tipo: "entrega_combinada", endereco: `${rua.trim()}, ${numeroEnd.trim()} — ${cidade.trim()}/${uf.trim().toUpperCase()} — CEP ${cepDigitos}`, servico: opcaoFrete.nome, prazoDias: opcaoFrete.prazoDias, freteExemplo: opcaoFrete.exemplo }
            : { tipo: "retirada_loja", loja: j.loja },
        pagamento: { metodo: j.pagamento, rotulo: j.pagarUrl ? (j.pagamento === "cartao" ? "Cartão de crédito pelo site" : "Pix pelo site") : "Pagar na retirada" },
        subtotal: j.subtotal,
        frete: Math.round((Number(j.total) - Number(j.subtotal)) * 100) / 100,
        total: j.total,
        status: "aguardando_pagamento",
      };
      try {
        const antigos = JSON.parse(localStorage.getItem(CHAVE_PEDIDOS) ?? "[]");
        localStorage.setItem(CHAVE_PEDIDOS, JSON.stringify([pedido, ...antigos]));
      } catch {
        /* sem armazenamento: o pedido continua salvo no banco */
      }
      if (typeof j.pagarUrl === "string" && j.pagarUrl.startsWith("/pagar/")) {
        router.push(j.pagarUrl); // Pix ou cartão: leva direto à página de pagamento
        return;
      }
      if (j.avisoPagamento) alert(j.avisoPagamento);
      router.push(`/pedido/${j.numero}`);
    } catch {
      setErroRapido("Sem conexão. Seu pedido NÃO foi enviado. Tente novamente.");
    } finally {
      setEnviando(false);
    }
  }

  const ligada = perfil?.logado === true && perfil.ligada;
  const lojaNome = LOJAS.find((l) => String(l.id) === lojaId)?.nome;
  // Se a forma escolhida não estiver disponível, volta para pagar na retirada.
  const rotuloLoja = receber === "casa" ? "Combinar o pagamento pelo WhatsApp" : "Pagar na loja, ao retirar";
  const formaEfetiva: "loja" | "pix" | "cartao" = forma === "pix" && online.pix ? "pix" : forma === "cartao" && online.cartao ? "cartao" : "loja";

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
        <div className="space-y-4 border-2 border-texto p-4 text-sm" role="group" aria-label="Confirmar compra com 1 clique">
          <p className="font-black uppercase tracking-wide">Confirmar compra</p>
          <div className="flex items-start justify-between gap-3 border-b border-borda pb-3">
            <p>
              1× {p.nome} <span className="text-fraco">(tam. {tamanho})</span>
            </p>
            <b className="shrink-0">{reais(p.preco)}</b>
          </div>
          <p className="text-fraco">
            Em nome de <b className="text-texto">{perfil.nome}</b>
            {perfil.telefone ? <>, contato com final <b className="text-texto">{perfil.telefone.slice(-4)}</b></> : null}.
          </p>

          <fieldset className="space-y-1.5">
            <legend className="text-xs font-bold uppercase tracking-wide text-fraco">Onde receber</legend>
            {([
              ["loja", "Retirar na loja", "Grátis"],
              ["casa", "Receber em casa", "Frete calculado pelo CEP"],
            ] as ["loja" | "casa", string, string][]).map(([v, rotulo, nota]) => (
              <label key={v} className={`flex cursor-pointer items-center justify-between gap-2 border px-3 py-2 ${receber === v ? "border-texto bg-tenue font-bold" : "border-borda"}`}>
                <span className="flex items-center gap-2">
                  <input type="radio" name="receber-rapido" checked={receber === v} onChange={() => setReceber(v)} />
                  {rotulo}
                </span>
                <span className="text-xs font-normal text-fraco">{nota}</span>
              </label>
            ))}
          </fieldset>

          {receber === "loja" ? (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wide text-fraco" htmlFor="loja-rapida">Loja para retirar</label>
              <select id="loja-rapida" className="campo !mt-1" value={lojaId ?? ""} onChange={(e) => trocarLoja(e.target.value)}>
                <option value="" disabled>Escolha a loja</option>
                {LOJAS.map((l) => (
                  <option key={l.id} value={l.id}>{l.nome}</option>
                ))}
              </select>
            </div>
          ) : (
            <div className="space-y-2">
              <input className="campo" placeholder="CEP" inputMode="numeric" maxLength={9} value={cep} autoComplete="postal-code" onChange={(e) => setCep(e.target.value.replace(/\D/g, "").replace(/^(\d{5})(\d)/, "$1-$2"))} />
              {erroFrete ? <p className="text-xs text-promo">{erroFrete}</p> : null}
              <div className="grid grid-cols-[1fr_90px] gap-2">
                <input className="campo" placeholder="Rua / Avenida" value={rua} onChange={(e) => setRua(e.target.value)} autoComplete="address-line1" />
                <input className="campo" placeholder="Número" value={numeroEnd} onChange={(e) => setNumeroEnd(e.target.value)} />
              </div>
              <input className="campo" placeholder="Complemento (opcional)" value={complemento} onChange={(e) => setComplemento(e.target.value)} autoComplete="address-line2" />
              <div className="grid grid-cols-[1fr_1fr_60px] gap-2">
                <input className="campo" placeholder="Bairro" value={bairro} onChange={(e) => setBairro(e.target.value)} />
                <input className="campo" placeholder="Cidade" value={cidade} onChange={(e) => setCidade(e.target.value)} />
                <input className="campo uppercase" placeholder="UF" maxLength={2} value={uf} onChange={(e) => setUf(e.target.value)} />
              </div>
              <div>
                <input className="campo" placeholder="Seu CPF (para a nota fiscal)" inputMode="numeric" value={cpf} onChange={(e) => setCpf(formatarCpf(e.target.value))} autoComplete="off" />
                <p className="mt-1 text-xs text-fraco">Obrigatório na entrega. Precisa ser o CPF da sua conta; não aparece em nenhuma tela.</p>
              </div>
              {cotacao ? (
                <div className="space-y-1.5">
                  <p className="text-xs font-bold uppercase tracking-wide text-fraco">Forma de envio</p>
                  {cotacao.opcoes.map((o) => (
                    <button key={o.servico} type="button" onClick={() => setServico(o.servico)} className={`flex w-full items-center justify-between border p-2.5 text-left ${servico === o.servico ? "border-texto bg-tenue" : "border-borda hover:border-texto"}`}>
                      <span>
                        <span className="block font-semibold">{o.nome}</span>
                        <span className="block text-xs text-fraco">Até {o.prazoDias} dias úteis{o.exemplo ? " (estimativa)" : ""}</span>
                      </span>
                      <b>{reais(o.valor)}</b>
                    </button>
                  ))}
                  {cotacao.aviso ? <p className="text-xs text-fraco">{cotacao.aviso}</p> : null}
                </div>
              ) : null}
            </div>
          )}

          {online.pix || online.cartao ? (
            <fieldset className="space-y-1.5">
              <legend className="text-xs font-bold uppercase tracking-wide text-fraco">Como pagar</legend>
              {([
                ["loja", rotuloLoja, true],
                ["pix", `Pix agora${online.teste ? " (teste)" : ""}`, online.pix],
                ["cartao", `Cartão de crédito agora${online.teste ? " (teste)" : ""}`, online.cartao],
              ] as [typeof forma, string, boolean][])
                .filter(([, , ligado]) => ligado)
                .map(([v, rotulo]) => (
                  <label key={v} className={`flex cursor-pointer items-center gap-2 border px-3 py-2 ${formaEfetiva === v ? "border-texto bg-tenue font-bold" : "border-borda"}`}>
                    <input type="radio" name="forma-rapida" checked={formaEfetiva === v} onChange={() => setForma(v)} />
                    {rotulo}
                  </label>
                ))}
            </fieldset>
          ) : null}

          <div className="space-y-1 border-t border-borda pt-3">
            <div className="flex justify-between text-fraco"><span>Produto</span><span>{reais(p.preco)}</span></div>
            <div className="flex justify-between text-fraco"><span>Frete</span><span>{receber === "loja" ? "Grátis (retirada)" : opcaoFrete ? reais(opcaoFrete.valor) : "Informe o CEP"}</span></div>
            <div className="flex justify-between text-base font-black"><span>Total</span><span>{reais(p.preco + frete)}</span></div>
          </div>
          <p className="text-xs text-fraco">
            {formaEfetiva === "loja"
              ? receber === "casa"
                ? "A loja confirma a disponibilidade e combina o pagamento com você pelo WhatsApp."
                : "Você paga na loja, ao retirar. A loja confirma a disponibilidade e avisa você."
              : "Você paga agora, na próxima tela. Se faltar o produto, devolvemos o valor."}
          </p>
          {erroRapido ? <p className="text-promo" role="alert">{erroRapido}</p> : null}
          <div className="flex gap-2">
            <button type="button" onClick={comprarUmClique} disabled={enviando || (receber === "loja" && !lojaNome)} className="btn flex-1">{enviando ? "Enviando…" : formaEfetiva === "loja" ? "Confirmar compra" : "Confirmar e pagar"}</button>
            <button type="button" onClick={() => setConfirmando(false)} disabled={enviando} className="btn-claro">Cancelar</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
