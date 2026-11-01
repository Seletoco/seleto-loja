"use client";

import { useState } from "react";
import { dataBr, reais } from "@/lib/format";
import type { RespostaConta } from "../api/conta/route";

const hoje = () => new Date(Date.now() - 3 * 3_600_000).toISOString().slice(0, 10); // dia de Brasília

function diasAte(iso: string) {
  return Math.round((new Date(iso + "T00:00:00Z").getTime() - new Date(hoje() + "T00:00:00Z").getTime()) / 86_400_000);
}

export default function Conta() {
  const [telefone, setTelefone] = useState("");
  const [cpf, setCpf] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [dados, setDados] = useState<RespostaConta | null>(null);

  async function consultar(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    setCarregando(true);
    try {
      const r = await fetch("/api/conta", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ telefone, cpf }) });
      const j = await r.json();
      if (!r.ok) setErro(j.erro ?? "Não foi possível consultar.");
      else setDados(j);
    } catch {
      setErro("Sem conexão. Tente novamente.");
    } finally {
      setCarregando(false);
    }
  }

  if (dados) {
    const disponivel = dados.cashbacks.filter((c) => diasAte(c.liberaEm) <= 0);
    const aLiberar = dados.cashbacks.filter((c) => diasAte(c.liberaEm) > 0);
    const soma = (l: typeof dados.cashbacks) => l.reduce((s, c) => s + c.valor, 0);
    return (
      <div className="mx-auto max-w-xl space-y-4">
        <h1 className="text-xl font-bold">Olá, {dados.nome}!</h1>
        {dados.demo ? <p className="rounded-md border border-borda bg-tenue p-2 text-xs text-fraco">Dados de demonstração.</p> : null}
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
                    <p className="text-xs text-fraco">
                      {libera > 0 ? `Libera em ${dataBr(c.liberaEm)} (${libera} ${libera === 1 ? "dia" : "dias"})` : "Liberado para uso"}
                    </p>
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
        <p className="text-xs text-fraco">Use o cashback nas lojas Seleto informando seu celular no caixa.</p>
        <button className="btn-claro w-full" onClick={() => setDados(null)}>Sair</button>
      </div>
    );
  }

  return (
    <form onSubmit={consultar} className="mx-auto max-w-sm space-y-3 rounded-xl border border-borda bg-painel p-6">
      <h1 className="text-xl font-bold">Meu cashback</h1>
      <p className="text-sm text-fraco">Veja quanto você tem, quando libera e quando vence.</p>
      <input className="campo" placeholder="Celular com DDD" inputMode="tel" value={telefone} onChange={(e) => setTelefone(e.target.value)} autoComplete="tel" required />
      <input className="campo" placeholder="3 primeiros dígitos do CPF" inputMode="numeric" maxLength={3} value={cpf} onChange={(e) => setCpf(e.target.value)} required />
      {erro ? <p className="text-sm text-promo">{erro}</p> : null}
      <button className="btn w-full" disabled={carregando}>{carregando ? "Consultando…" : "Consultar"}</button>
      <p className="text-xs text-fraco">Teste: celular 21 99999-9999 e CPF começando com 123.</p>
    </form>
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
