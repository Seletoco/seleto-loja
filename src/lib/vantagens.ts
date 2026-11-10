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
  /** O que o nível dá de verdade (confirmado no sistema). */
  beneficios: string[];
}

/**
 * REGRA DO CLUBE (fonte: SeleChat, `src/lib/vip.ts`, fechada com o Victor em 28/09/2026). Se mudar lá, mude aqui.
 * A porta: 3 compras E R$ 1.000 nos últimos 12 meses, somando as 4 lojas. Depois o nível sobe pelo valor do ano.
 */
export const PORTA_DO_CLUBE = "3 compras e R$ 1.000 nos últimos 12 meses (somando as 4 lojas)";

/** O que cada nível dá DE VERDADE hoje: os grupos VIP do WhatsApp (Prata não tem grupo). Nada inventado. */
export const BENEFICIOS_POR_NIVEL: BeneficioNivel[] = [
  { nivel: "Prata", beneficios: ["Você entra para o clube Seleto"] },
  { nivel: "Ouro", beneficios: ["Convite para o grupo VIP Ouro da Seleto, no WhatsApp"] },
  { nivel: "Diamante", beneficios: ["Convite para o grupo VIP Diamante da Seleto, no WhatsApp"] },
];

/** Números de confiança só aparecem se forem reais e informados pelo dono (ex.: NEXT_PUBLIC_CLIENTES_ATENDIDOS=25000). */
export const clientesAtendidos = (): number | null => {
  const n = Number(process.env.NEXT_PUBLIC_CLIENTES_ATENDIDOS);
  return Number.isFinite(n) && n > 0 ? n : null;
};
