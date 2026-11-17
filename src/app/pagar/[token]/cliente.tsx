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
