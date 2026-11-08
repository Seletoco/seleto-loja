/**
 * CONFIGURAÇÃO DAS VANTAGENS MOSTRADAS NA LOJA (cashback, níveis, confiança).
 *
 * Nada aqui inventa número: o que ainda não foi definido pelo Victor fica `null`/`exemplo: true`
 * e a tela mostra o texto genérico (ou "(exemplo)"). Para valer de verdade, defina na Vercel
 * (ou troque aqui) quando as regras forem decididas.
 */

/**
 * % de cashback que o cliente GANHA numa compra (regra de geração, hoje em `cashback_regras` no banco).
 * Defina `NEXT_PUBLIC_CASHBACK_PERCENTUAL` (ex.: 5) só quando o valor for o real. Sem isso, a loja
 * fala em "ganhe cashback" sem prometer valor.
 */
export const percentualCashbackGanho = (): number | null => {
  const n = Number(process.env.NEXT_PUBLIC_CASHBACK_PERCENTUAL);
  return Number.isFinite(n) && n > 0 && n <= 100 ? n : null;
};

/** Quanto de cashback uma compra de `valor` gera (ou null se o percentual não foi definido). Função pura. */
export function cashbackGanho(valor: number, percentual: number | null = percentualCashbackGanho()): number | null {
  if (percentual === null || !(valor > 0)) return null;
  return Math.floor(valor * percentual) / 100;
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
