"use client";

import { useEffect, useState } from "react";
import type { RegrasCashback } from "./regras-servidor";
import type { RegraDeUso } from "./regra-cashback";

// Só tipos vêm do módulo do servidor (apagados no build); o padrão é repetido aqui para não puxar o `pg` para o navegador.
const PADRAO: RegrasCashback = { ganhoMinPct: 10, ganhoMaxPct: 15, diasParaLiberar: 7, validadeDias: 30, tetoUsoPct: 20, compraMinima: 0, exemplo: true };

/** Regras do cashback para telas de navegador: começa no padrão e troca pelas do sistema assim que a API responde. */
export function useRegrasCashback(): RegrasCashback {
  const [r, setR] = useState<RegrasCashback>(PADRAO);
  useEffect(() => {
    let vivo = true;
    fetch("/api/cashback/regra")
      .then((x) => (x.ok ? x.json() : null))
      .then((j: RegrasCashback | null) => { if (vivo && j) setR(j); })
      .catch(() => {});
    return () => { vivo = false; };
  }, []);
  return r;
}

export const regraDeUsoDe = (r: RegrasCashback): RegraDeUso => ({ compraMinima: r.compraMinima, tetoPercentualDaCompra: r.tetoUsoPct, exemplo: r.exemplo });
