/**
 * CONFIGURAÇÃO DAS VANTAGENS MOSTRADAS NA LOJA (cashback, níveis, confiança).
 *
 * Percentuais e prazos do cashback NÃO ficam aqui: vêm do sistema (`regras-servidor.ts`).
 * Aqui só ficam os benefícios por nível (provisórios até o Victor definir) e números de confiança opcionais.
 */

/**
 * Faixa de cashback que uma compra de `valor` gera, pelas regras do sistema (o % depende da forma de pagamento
 * escolhida no caixa: ver `regrasCashback()`). Sempre arredonda para baixo. Função pura.
 */
export function faixaCashback(valor: number, minPct: number, maxPct: number): { min: number; max: number } | null {
  if (!(valor > 0) || !(minPct > 0) || !(maxPct >= minPct)) return null;
  const f = (p: number) => Math.floor(valor * p) / 100;
  return { min: f(minPct), max: f(maxPct) };
}

export interface BeneficioNivel {
  nivel: "Prata" | "Ouro" | "Diamante";
  /** Benefícios propostos — PROVISÓRIOS até o Victor definir. */
  beneficios: string[];
}

/** Benefícios por nível. `BENEFICIOS_SAO_EXEMPLO` faz a tela avisar que ainda é proposta. */
export const BENEFICIOS_SAO_EXEMPLO = true;
export const BENEFICIOS_POR_NIVEL: BeneficioNivel[] = [
  { nivel: "Prata", beneficios: ["Entrada na lista VIP (ofertas e novidades antes de todo mundo)"] },
  { nivel: "Ouro", beneficios: ["Tudo do Prata", "Aviso antecipado de lançamentos"] },
  { nivel: "Diamante", beneficios: ["Tudo do Ouro", "Atendimento prioritário no WhatsApp"] },
];

/** Números de confiança só aparecem se forem reais e informados pelo dono (ex.: NEXT_PUBLIC_CLIENTES_ATENDIDOS=25000). */
export const clientesAtendidos = (): number | null => {
  const n = Number(process.env.NEXT_PUBLIC_CLIENTES_ATENDIDOS);
  return Number.isFinite(n) && n > 0 ? n : null;
};
