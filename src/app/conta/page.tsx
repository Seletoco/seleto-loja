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

function Area({ dados, sair }: { dados: DadosConta; sair: () => void }) {
  const [aba, setAba] = useState<Aba>("cashback");
  const abas: [Aba, string][] = [["cashback", "Cashback"], ["compras", "Compras"], ["nivel", "Meu nível"]];
  return (
    <div className="mx-auto max-w-xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Olá, {dados.nome}!</h1>
        <span className="rounded-full border border-borda bg-tenue px-3 py-1 text-xs font-semibold">{dados.nivel.nome}</span>
      </div>
      {dados.demo ? <p className="rounded-md border border-borda bg-tenue p-2 text-xs text-fraco">Dados de demonstração.</p> : null}
      <div className="flex gap-2">
        {abas.map(([k, t]) => (
          <button key={k} onClick={() => setAba(k)} className={`flex-1 rounded-lg border px-3 py-2 text-sm font-semibold ${aba === k ? "border-texto bg-texto text-white" : "border-borda bg-painel"}`}>{t}</button>
        ))}
      </div>
      {aba === "cashback" ? <AbaCashback dados={dados} /> : aba === "compras" ? <AbaCompras dados={dados} /> : <AbaNivel dados={dados} />}
      <button className="btn-claro w-full" onClick={sair}>Sair</button>
    </div>
  );
}

function AbaCashback({ dados }: { dados: DadosConta }) {
  const disponivel = dados.cashbacks.filter((c) => diasAte(c.liberaEm) <= 0);
  const aLiberar = dados.cashbacks.filter((c) => diasAte(c.liberaEm) > 0);
  const soma = (l: typeof dados.cashbacks) => l.reduce((s, c) => s + c.valor, 0);
  const usados = dados.extrato.filter((e) => e.saldo <= 0 || e.usou > 0);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Caixa titulo="Pode usar agora" valor={reais(soma(disponivel))} destaque />
        <Caixa titulo="Libera em breve" valor={reais(soma(aLiberar))} />
      </div>
      {dados.cashbacks.length === 0 ? (
        <p className="rounded-lg border border-borda bg-painel p-6 text-center text-fraco">Você não tem cashback no momento.</p>
      ) : (
        <ul className="space-y-2">
          {dados.cashbacks.map((c, i) => {
            const libera = diasAte(c.liberaEm);
            const vence = diasAte(c.venceEm);
            return (
              <li key={i} className="flex items-center justify-between gap-3 rounded-lg border border-borda bg-painel p-3">
                <div>
                  <p className="font-bold">{reais(c.valor)}</p>
                  <p className="text-xs text-fraco">{libera > 0 ? `Libera em ${dataBr(c.liberaEm)} (${libera} ${libera === 1 ? "dia" : "dias"})` : "Liberado para uso"}</p>
                </div>
                <p className={`text-right text-xs ${vence <= 7 ? "font-semibold text-promo" : "text-fraco"}`}>
                  Vence em {dataBr(c.venceEm)}
                  <br />
                  {vence <= 0 ? "vence hoje" : `faltam ${vence} ${vence === 1 ? "dia" : "dias"}`}
                </p>
              </li>
            );
          })}
        </ul>
      )}
      {usados.length > 0 ? (
        <div>
          <h2 className="mb-2 text-sm font-bold">Histórico</h2>
          <ul className="space-y-1 text-sm">
            {usados.map((e, i) => (
              <li key={i} className="flex justify-between rounded-md border border-borda bg-tenue px-3 py-2">
                <span>{dataBr(e.data)} · ganhou {reais(e.ganhou)}</span>
                <span className="text-fraco">usou {reais(e.usou)}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <p className="text-xs text-fraco">Use o cashback nas lojas Seleto informando seu celular no caixa. Desconto máximo de 20% do valor da compra.</p>
    </div>
  );
}

function AbaCompras({ dados }: { dados: DadosConta }) {
  if (dados.comprasOcultas) return <p className="rounded-lg border border-borda bg-painel p-6 text-center text-fraco">Por segurança, suas compras aparecem depois que ativarmos a confirmação por WhatsApp. Em breve!</p>;
  if (dados.compras.length === 0) return <p className="rounded-lg border border-borda bg-painel p-6 text-center text-fraco">Nenhuma compra encontrada.</p>;
  return (
    <ul className="space-y-2">
      {dados.compras.map((c) => (
        <li key={c.id} className="rounded-lg border border-borda bg-painel p-3">
          <div className="flex justify-between">
            <p className="font-bold">{reais(c.valor)}</p>
            <p className="text-xs text-fraco">{dataBr(c.data)} · {c.loja}</p>
          </div>
          {c.cashbackUsado > 0 ? <p className="text-xs text-fraco">Cashback usado: {reais(c.cashbackUsado)}</p> : null}
          {c.itens.length > 0 ? (
            <ul className="mt-2 space-y-0.5 text-xs text-fraco">
              {c.itens.map((it, i) => <li key={i}>{it.quantidade}× {it.nome}{it.detalhe ? ` (${it.detalhe})` : ""}</li>)}
            </ul>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

function AbaNivel({ dados }: { dados: DadosConta }) {
  const n = dados.nivel;
  return (
    <div className="space-y-3 rounded-lg border border-borda bg-painel p-4">
      <p className="text-sm text-fraco">Seu nível</p>
      <p className="text-3xl font-black">{n.nome}</p>
      <p className="text-sm">Nos últimos 12 meses: {n.compras12m} {n.compras12m === 1 ? "compra" : "compras"} · {reais(n.gasto12m)}</p>
      {n.proximo ? (
        <p className="rounded-md bg-tenue p-3 text-sm">
          Para chegar ao nível <b>{n.proximo}</b>: faltam <b>{reais(n.faltaGasto)}</b>
          {n.faltaCompras > 0 ? <> e <b>{n.faltaCompras} {n.faltaCompras === 1 ? "compra" : "compras"}</b></> : null}.
        </p>
      ) : (
        <p className="rounded-md bg-tenue p-3 text-sm">Você está no nível máximo. Obrigado pela preferência!</p>
      )}
    </div>
  );
}

function Caixa({ titulo, valor, destaque }: { titulo: string; valor: string; destaque?: boolean }) {
  return (
    <div className={`rounded-lg border p-3 ${destaque ? "border-texto bg-painel" : "border-borda bg-tenue"}`}>
      <p className="text-xs text-fraco">{titulo}</p>
      <p className="text-xl font-black">{valor}</p>
    </div>
  );
}
