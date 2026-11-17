"use client";

import { useState } from "react";

type Resumo = { ambiente: "sandbox" | "producao"; ativo: boolean; temClientId: boolean; temClientSecret: boolean; temPv: boolean; pronto: boolean };

/** Cartão "Pagamento (Rede)" do painel: o que está configurado e o botão de testar a conexão (só pede o token). */
export function CartaoRede({ resumo }: { resumo: Resumo }) {
  const [estado, setEstado] = useState<{ ok: boolean; texto: string } | null>(null);
  const [testando, setTestando] = useState(false);
  const item = (ok: boolean, nome: string) => (
    <li key={nome}>{ok ? "✓" : "✗"} {nome}</li>
  );

  async function testar() {
    setTestando(true);
    setEstado(null);
    try {
      const r = await fetch("/api/admin/rede/conexao", { method: "POST" });
      const j = (await r.json()) as { ok?: boolean; erro?: string; tokenValeAte?: string };
      if (j.ok) setEstado({ ok: true, texto: `Conexão OK. A Rede entregou o token (vale até ${new Date(j.tokenValeAte!).toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo" })}). Nenhuma cobrança foi feita.` });
      else setEstado({ ok: false, texto: j.erro ?? "Não foi possível testar." });
    } catch {
      setEstado({ ok: false, texto: "Sem conexão com o servidor." });
    } finally {
      setTestando(false);
    }
  }

  return (
    <section className="rounded-lg border border-borda bg-painel p-4 text-sm">
      <p className="font-semibold">Pagamento (Rede)</p>
      <p className="text-fraco">
        Ambiente: <b className="text-texto">{resumo.ambiente === "producao" ? "PRODUÇÃO" : "sandbox (testes)"}</b>
        {" · "}Cobrança no site: <b className="text-texto">{resumo.ativo ? "ligada" : "desligada"}</b>
      </p>
      <ul className="mt-2 grid gap-0.5 text-xs text-fraco sm:grid-cols-3">
        {item(resumo.temPv, "REDE_PV (o PV)")}
        {item(resumo.temClientSecret, "REDE_CLIENT_SECRET (Chave de Integração)")}
        {item(resumo.temClientId, "REDE_CLIENT_ID (opcional: igual ao PV)")}
      </ul>
      <button onClick={testar} disabled={!resumo.pronto || testando} className="btn-claro mt-3 !px-3 !py-2 !text-xs">
        {testando ? "Testando…" : "Testar conexão com a Rede"}
      </button>
      {!resumo.pronto ? <p className="mt-2 text-xs text-fraco">Coloque REDE_PV (o número do estabelecimento) e REDE_CLIENT_SECRET (a Chave de Integração do Portal Use Rede) na Vercel, como Secret, e faça redeploy.</p> : null}
      {estado ? <p className={`mt-2 text-xs ${estado.ok ? "text-ok" : "text-promo"}`}>{estado.texto}</p> : null}
    </section>
  );
}
