"use client";

import { useEffect, useState } from "react";
import { dataBr, reais } from "@/lib/format";
import { cpfValido, formatarCpf } from "@/lib/cpf";
import type { DadosConta } from "@/lib/conta-tipos";

const hoje = () => new Date(Date.now() - 3 * 3_600_000).toISOString().slice(0, 10); // dia de Brasília
const diasAte = (iso: string) => Math.round((new Date(iso + "T00:00:00Z").getTime() - new Date(hoje() + "T00:00:00Z").getTime()) / 86_400_000);
const post = (url: string, corpo: object) => fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(corpo) });

type Aba = "cashback" | "compras" | "nivel";

export default function Conta() {
  const [dados, setDados] = useState<DadosConta | null>(null);
  const [verificando, setVerificando] = useState(true);

  useEffect(() => {
    fetch("/api/conta/dados").then(async (r) => { if (r.ok) setDados(await r.json()); }).finally(() => setVerificando(false));
  }, []);

  async function sair() {
    await fetch("/api/conta/sair", { method: "POST" });
    setDados(null);
  }

  if (verificando) return <p className="py-10 text-center text-fraco">Carregando…</p>;
  return dados ? <Area dados={dados} sair={sair} /> : <Login aoEntrar={(d) => setDados(d)} />;
}

function Login({ aoEntrar }: { aoEntrar: (d: DadosConta) => void }) {
  const [cpf, setCpf] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    if (!cpfValido(cpf)) return setErro("CPF inválido. Confira os 11 números.");
    setCarregando(true);
    try {
      const r = await post("/api/conta/entrar", { cpf });
      if (!r.ok) return setErro((await r.json()).erro ?? "Não foi possível entrar.");
      const d = await fetch("/api/conta/dados");
      if (d.ok) aoEntrar(await d.json());
      else setErro("Não foi possível carregar seus dados.");
    } catch {
      setErro("Sem conexão. Tente novamente.");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <form onSubmit={entrar} className="mx-auto max-w-sm space-y-3 rounded-xl border border-borda bg-painel p-6">
      <h1 className="text-xl font-bold">Minha conta Seleto</h1>
      <p className="text-sm text-fraco">Digite seu CPF para ver seu cashback e seu nível.</p>
      <input className="campo" placeholder="Seu CPF" inputMode="numeric" maxLength={14} value={cpf} onChange={(e) => setCpf(formatarCpf(e.target.value))} autoComplete="off" required />
      {erro ? <p className="text-sm text-promo">{erro}</p> : null}
      <button className="btn w-full" disabled={carregando}>{carregando ? "Entrando…" : "Entrar"}</button>
      <p className="text-xs text-fraco">Teste: CPF 529.982.247-25.</p>
    </form>
  );
}

const COR_NIVEL: Record<string, string> = { Cliente: "#707072", Prata: "#9aa4b2", Ouro: "#d4af37", Diamante: "#7c3aed" };
const ordem = ["Cliente", "Prata", "Ouro", "Diamante"];

function Icone({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={d} />
    </svg>
  );
}
const ICONES = { cashback: "M12 2v20M17 6H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6", compras: "M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4zM3 6h18M16 10a4 4 0 0 1-8 0", nivel: "M12 2l3 7 7 .6-5.3 4.7 1.6 7.2L12 17.8 5.7 21.5l1.6-7.2L2 9.6 9 9z" };

function Area({ dados, sair }: { dados: DadosConta; sair: () => void }) {
  const [aba, setAba] = useState<Aba>("cashback");
  const abas: [Aba, string][] = [["cashback", "Cashback"], ["compras", "Compras"], ["nivel", "Meu nível"]];
  const n = dados.nivel;
  const disponivel = dados.cashbacks.filter((c) => diasAte(c.liberaEm) <= 0).reduce((s, c) => s + c.valor, 0);
  const aLiberar = dados.cashbacks.filter((c) => diasAte(c.liberaEm) > 0).reduce((s, c) => s + c.valor, 0);
  const proximoVence = dados.cashbacks.filter((c) => diasAte(c.liberaEm) <= 0).map((c) => diasAte(c.venceEm)).sort((a, b) => a - b)[0];
  const cor = COR_NIVEL[n.nome];
  const alvo = n.proximo === "Prata" ? 1000 : n.proximo === "Ouro" ? 2000 : n.proximo === "Diamante" ? 4000 : 4000;
  const pct = n.proximo ? Math.min(100, Math.round((n.gasto12m / alvo) * 100)) : 100;
  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-fraco">Minha conta</p>
          <h1 className="titulao text-3xl sm:text-4xl">Olá, {dados.nome}</h1>
        </div>
        <button onClick={sair} className="text-xs font-bold uppercase tracking-wide text-fraco underline underline-offset-4 hover:text-texto">Sair</button>
      </div>
      {dados.demo ? <p className="bg-destaque px-3 py-2 text-xs font-bold uppercase tracking-wide">Dados de demonstração</p> : null}

      <div className="grid gap-5 lg:grid-cols-[360px_1fr]">
        {/* coluna do resumo */}
        <div className="space-y-5 lg:sticky lg:top-24 lg:self-start">
          <section className="relative overflow-hidden bg-texto p-6 text-white">
            <div className="pointer-events-none absolute -bottom-8 -right-8 h-20 w-20 rotate-12 bg-destaque" />
            <p className="relative text-xs font-bold uppercase tracking-widest text-white/70">Cashback para usar agora</p>
            <p className="relative mt-1 text-5xl font-black tracking-tight text-destaque">{reais(disponivel)}</p>
            <div className="relative mt-4 grid grid-cols-2 gap-3 border-t border-white/20 pt-4 text-sm">
              <div>
                <p className="text-xs text-white/60">Libera em breve</p>
                <p className="font-bold">{reais(aLiberar)}</p>
              </div>
              <div>
                <p className="text-xs text-white/60">Próximo vencimento</p>
                <p className={`font-bold ${proximoVence !== undefined && proximoVence <= 7 ? "text-destaque" : ""}`}>{proximoVence === undefined ? "—" : proximoVence <= 0 ? "hoje" : `${proximoVence} ${proximoVence === 1 ? "dia" : "dias"}`}</p>
              </div>
            </div>
          </section>

          <section className="border border-borda bg-painel p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-widest text-fraco">Seu nível</p>
              <span className="px-3 py-1 text-xs font-black uppercase tracking-wide text-white" style={{ background: cor }}>{n.nome}</span>
            </div>
            <div className="mt-4 h-2 w-full bg-tenue">
              <div className="h-2 transition-all" style={{ width: `${pct}%`, background: cor }} />
            </div>
            <div className="mt-2 flex justify-between text-[10px] font-bold uppercase tracking-wide text-fraco">
              {ordem.map((o) => <span key={o} className={o === n.nome ? "text-texto" : ""}>{o}</span>)}
            </div>
            <p className="mt-3 text-sm">
              {n.proximo ? <>Faltam <b>{reais(n.faltaGasto)}</b>{n.faltaCompras > 0 ? <> e <b>{n.faltaCompras} {n.faltaCompras === 1 ? "compra" : "compras"}</b></> : null} para o nível <b>{n.proximo}</b>.</> : "Você está no nível máximo. Obrigado!"}
            </p>
          </section>
        </div>

        {/* coluna do conteúdo */}
        <div className="min-w-0 space-y-4">
          <div className="grid grid-cols-3 border border-borda bg-painel">
            {abas.map(([k, t]) => (
              <button key={k} onClick={() => setAba(k)} className={`flex items-center justify-center gap-2 px-2 py-3 text-xs font-bold uppercase tracking-wide transition sm:text-sm ${aba === k ? "bg-texto text-white" : "hover:bg-tenue"}`}>
                <Icone d={ICONES[k]} />
                {t}
              </button>
            ))}
          </div>
          {aba === "cashback" ? <AbaCashback dados={dados} /> : aba === "compras" ? <AbaCompras dados={dados} /> : <AbaNivel dados={dados} />}
        </div>
      </div>
    </div>
  );
}

function AbaCashback({ dados }: { dados: DadosConta }) {
  const usados = dados.extrato.filter((e) => e.saldo <= 0 || e.usou > 0);
  return (
    <div className="space-y-5">
      {dados.cashbacks.length === 0 ? (
        <p className="border border-borda bg-painel p-8 text-center text-fraco">Você não tem cashback no momento. Ele aparece aqui depois da sua próxima compra.</p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {dados.cashbacks.map((c, i) => {
            const libera = diasAte(c.liberaEm);
            const vence = diasAte(c.venceEm);
            const pronto = libera <= 0;
            const urgente = pronto && vence <= 7;
            return (
              <li key={i} className={`relative overflow-hidden border p-4 ${urgente ? "border-promo" : "border-borda"} bg-painel`}>
                <span className={`absolute left-0 top-0 h-full w-1 ${pronto ? "bg-ok" : "bg-destaque"}`} />
                <div className="flex items-start justify-between gap-2 pl-2">
                  <p className="text-2xl font-black">{reais(c.valor)}</p>
                  <span className={`px-2 py-1 text-[10px] font-black uppercase tracking-wide ${pronto ? "bg-ok text-white" : "bg-destaque text-texto"}`}>{pronto ? "Liberado" : `Libera em ${libera} ${libera === 1 ? "dia" : "dias"}`}</span>
                </div>
                <p className="mt-2 pl-2 text-xs text-fraco">{pronto ? "Pronto para usar" : `Libera em ${dataBr(c.liberaEm)}`}</p>
                <p className={`pl-2 text-xs ${urgente ? "font-bold text-promo" : "text-fraco"}`}>
                  {vence <= 0 ? "Vence hoje" : `Vence em ${dataBr(c.venceEm)} · faltam ${vence} ${vence === 1 ? "dia" : "dias"}`}
                </p>
              </li>
            );
          })}
        </ul>
      )}
      {usados.length > 0 ? (
        <section>
          <h2 className="mb-2 text-xs font-bold uppercase tracking-widest text-fraco">Histórico</h2>
          <ul className="divide-y divide-borda border border-borda bg-painel text-sm">
            {usados.map((e, i) => (
              <li key={i} className="flex items-center justify-between gap-3 px-4 py-3">
                <span>{dataBr(e.data)} · ganhou <b>{reais(e.ganhou)}</b></span>
                <span className="text-fraco">usou {reais(e.usou)}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <p className="text-xs text-fraco">Use o cashback nas lojas Seleto informando seu celular no caixa. Desconto máximo de 20% do valor da compra.</p>
    </div>
  );
}

function AbaCompras({ dados }: { dados: DadosConta }) {
  if (dados.comprasOcultas) return <p className="border border-borda bg-painel p-8 text-center text-fraco">Por segurança, suas compras aparecem depois que ativarmos a confirmação por WhatsApp. Em breve!</p>;
  if (dados.compras.length === 0) return <p className="border border-borda bg-painel p-8 text-center text-fraco">Nenhuma compra encontrada.</p>;
  return (
    <ul className="space-y-3">
      {dados.compras.map((c) => (
        <li key={c.id} className="border border-borda bg-painel">
          <div className="flex items-center justify-between gap-3 border-b border-borda bg-tenue px-4 py-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide">{c.loja}</p>
              <p className="text-xs text-fraco">{dataBr(c.data)}</p>
            </div>
            <p className="text-lg font-black">{reais(c.valor)}</p>
          </div>
          <div className="px-4 py-3">
            {c.itens.length > 0 ? (
              <ul className="space-y-1 text-sm">
                {c.itens.map((it, i) => (
                  <li key={i} className="flex justify-between gap-3">
                    <span>{it.nome}{it.detalhe ? <span className="text-fraco"> · {it.detalhe}</span> : null}</span>
                    <span className="text-fraco">{it.quantidade}×</span>
                  </li>
                ))}
              </ul>
            ) : null}
            {c.cashbackUsado > 0 ? <p className="mt-2 inline-block bg-destaque px-2 py-1 text-[10px] font-black uppercase tracking-wide">Cashback usado: {reais(c.cashbackUsado)}</p> : null}
          </div>
        </li>
      ))}
    </ul>
  );
}

function AbaNivel({ dados }: { dados: DadosConta }) {
  const n = dados.nivel;
  const regras: [string, string][] = [["Prata", "3 compras e R$ 1.000 em 12 meses"], ["Ouro", "R$ 2.000 em 12 meses"], ["Diamante", "R$ 4.000 em 12 meses"]];
  return (
    <div className="space-y-3">
      <div className="border border-borda bg-painel p-5">
        <p className="text-xs font-bold uppercase tracking-widest text-fraco">Nos últimos 12 meses</p>
        <div className="mt-2 grid grid-cols-2 gap-3">
          <div><p className="text-3xl font-black">{n.compras12m}</p><p className="text-xs text-fraco">{n.compras12m === 1 ? "compra" : "compras"}</p></div>
          <div><p className="text-3xl font-black">{reais(n.gasto12m)}</p><p className="text-xs text-fraco">em compras</p></div>
        </div>
      </div>
      <ul className="space-y-2">
        {regras.map(([nome, regra]) => {
          const atingido = ordem.indexOf(n.nome) >= ordem.indexOf(nome);
          return (
            <li key={nome} className={`flex items-center justify-between gap-3 border p-4 ${atingido ? "border-texto" : "border-borda"} bg-painel`}>
              <div className="flex items-center gap-3">
                <span className="h-8 w-8" style={{ background: COR_NIVEL[nome], opacity: atingido ? 1 : 0.35 }} />
                <div>
                  <p className="font-black uppercase">{nome}</p>
                  <p className="text-xs text-fraco">{regra}</p>
                </div>
              </div>
              <span className={`text-xs font-bold uppercase ${atingido ? "text-ok" : "text-fraco"}`}>{atingido ? "Conquistado" : "A conquistar"}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
