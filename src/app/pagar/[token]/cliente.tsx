"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export function CopiaECola({ codigo }: { codigo: string }) {
  const [copiado, setCopiado] = useState(false);
  return (
    <div className="space-y-2">
      <textarea readOnly value={codigo} rows={3} className="campo w-full resize-none text-xs" aria-label="Pix copia e cola" onFocus={(e) => e.currentTarget.select()} />
      <button
        type="button"
        className="btn w-full"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(codigo);
            setCopiado(true);
            setTimeout(() => setCopiado(false), 2500);
          } catch {
            /* sem permissão de copiar: o cliente seleciona o texto acima */
          }
        }}
      >
        {copiado ? "Copiado!" : "Copiar código Pix"}
      </button>
    </div>
  );
}

/** Confere o pagamento a cada 10 s (até 30 min) e recarrega a página quando muda. */
export function Atualizador({ token }: { token: string }) {
  const router = useRouter();
  useEffect(() => {
    let vezes = 0;
    const t = setInterval(async () => {
      if (++vezes > 180) return clearInterval(t);
      try {
        const r = await fetch(`/api/pagar/${encodeURIComponent(token)}`, { cache: "no-store" });
        const j = (await r.json()) as { status?: string };
        if (j.status && j.status !== "pendente") {
          clearInterval(t);
          router.refresh();
        }
      } catch {
        /* tenta de novo na próxima volta */
      }
    }, 10_000);
    return () => clearInterval(t);
  }, [token, router]);
  return <p className="text-xs text-fraco">Esta página confirma sozinha quando o pagamento cair.</p>;
}

const so = (v: string) => v.replace(/\D/g, "");
const grupos = (v: string) => so(v).slice(0, 19).replace(/(.{4})/g, "$1 ").trim();
const validade = (v: string) => {
  const d = so(v).slice(0, 4);
  return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
};

/** Formulário do cartão. Os dados vão direto para o servidor da Seleto → Rede; nada é guardado no navegador. */
export function FormCartao({ token, valor, parcelasMax }: { token: string; valor: number; parcelasMax: number }) {
  const router = useRouter();
  const [numero, setNumero] = useState("");
  const [nome, setNome] = useState("");
  const [val, setVal] = useState("");
  const [cvv, setCvv] = useState("");
  const [parcelas, setParcelas] = useState(1);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const [travado, setTravado] = useState(false);

  async function pagar(e: React.FormEvent) {
    e.preventDefault();
    if (enviando || travado) return;
    setEnviando(true);
    setErro("");
    try {
      const r = await fetch(`/api/pagar/${encodeURIComponent(token)}/cartao`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ numero, nome, validade: val, cvv, parcelas }),
      });
      const j = (await r.json().catch(() => ({}))) as { ok?: boolean; erro?: string; final?: boolean };
      if (j.ok) {
        setNumero("");
        setCvv("");
        router.refresh();
        return;
      }
      setCvv("");
      setErro(j.erro ?? "Não foi possível processar o pagamento.");
      if (j.final) setTravado(true);
    } catch {
      setErro("Sem conexão. Confira se o pagamento não foi feito antes de tentar de novo.");
    } finally {
      setEnviando(false);
    }
  }

  const reais = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  return (
    <form onSubmit={pagar} className="space-y-3 border border-borda bg-painel p-5" autoComplete="on">
      <label className="block text-xs font-bold uppercase tracking-wide">
        Número do cartão
        <input className="campo mt-1 w-full" inputMode="numeric" autoComplete="cc-number" placeholder="0000 0000 0000 0000" value={numero} onChange={(e) => setNumero(grupos(e.target.value))} required />
      </label>
      <label className="block text-xs font-bold uppercase tracking-wide">
        Nome como está no cartão
        <input className="campo mt-1 w-full" autoComplete="cc-name" value={nome} onChange={(e) => setNome(e.target.value)} required maxLength={40} />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="block text-xs font-bold uppercase tracking-wide">
          Validade
          <input className="campo mt-1 w-full" inputMode="numeric" autoComplete="cc-exp" placeholder="MM/AA" value={val} onChange={(e) => setVal(validade(e.target.value))} required />
        </label>
        <label className="block text-xs font-bold uppercase tracking-wide">
          CVV
          <input className="campo mt-1 w-full" inputMode="numeric" autoComplete="cc-csc" placeholder="123" value={cvv} onChange={(e) => setCvv(so(e.target.value).slice(0, 4))} required />
        </label>
      </div>
      {parcelasMax > 1 ? (
        <label className="block text-xs font-bold uppercase tracking-wide">
          Parcelas
          <select className="campo mt-1 w-full" value={parcelas} onChange={(e) => setParcelas(Number(e.target.value))}>
            {Array.from({ length: parcelasMax }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {n}x de {reais(valor / n)} sem juros
              </option>
            ))}
          </select>
        </label>
      ) : null}
      {erro ? <p role="alert" className="text-sm font-bold text-promo">{erro}</p> : null}
      <button className="btn w-full" disabled={enviando || travado}>
        {enviando ? "Processando… não feche a página" : `Pagar ${reais(valor)}`}
      </button>
      <p className="text-center text-xs text-fraco">Os dados do cartão vão direto para a Rede e não ficam guardados na Seleto.</p>
    </form>
  );
}
