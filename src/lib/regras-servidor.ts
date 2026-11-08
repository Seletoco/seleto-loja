/**
 * Regras do cashback LIDAS DO SISTEMA (views `loja.v_regras_cashback` e `loja.v_cashback_formas`, migration 007).
 * A loja online não inventa regra: quando o banco está ligado, vale o que o Victor configurou no sistema.
 * Sem banco (demonstração) ou se a leitura falhar, usa o PADRÃO abaixo, copiado do sistema em 08/11/2026, marcado `exemplo: true`.
 */
import { bancoLigado, db } from "./db";

export interface RegrasCashback {
  /** Menor e maior % de cashback ganho (varia conforme a forma de pagamento escolhida no caixa). */
  ganhoMinPct: number;
  ganhoMaxPct: number;
  diasParaLiberar: number;
  validadeDias: number;
  /** Quanto do valor da compra o cashback pode cobrir, em %. */
  tetoUsoPct: number;
  /** O sistema não define compra mínima para usar: 0 = sem mínimo. */
  compraMinima: number;
  /** true = valores de reserva (sem banco), não lidos do sistema agora. */
  exemplo: boolean;
}

export const REGRAS_PADRAO: RegrasCashback = { ganhoMinPct: 10, ganhoMaxPct: 15, diasParaLiberar: 7, validadeDias: 30, tetoUsoPct: 20, compraMinima: 0, exemplo: true };

let cache: { em: number; regras: RegrasCashback } | null = null;
const VALE_MS = 5 * 60_000;

export async function regrasCashback(): Promise<RegrasCashback> {
  if (!bancoLigado()) return REGRAS_PADRAO;
  if (cache && Date.now() - cache.em < VALE_MS) return cache.regras;
  try {
    const banco = db();
    const [{ rows: r }, { rows: f }] = await Promise.all([
      banco.query<{ percentual_automatico: string; dias_para_liberar: number; validade_dias: number; desconto_total_max_pct: string | null }>(
        `SELECT percentual_automatico, dias_para_liberar, validade_dias, desconto_total_max_pct FROM loja.v_regras_cashback LIMIT 1`,
      ),
      banco.query<{ percentual: string }>(`SELECT percentual FROM loja.v_cashback_formas`),
    ]);
    if (!r[0]) return REGRAS_PADRAO;
    const pcts = [Number(r[0].percentual_automatico), ...f.map((x) => Number(x.percentual))].filter((n) => Number.isFinite(n) && n > 0);
    const teto = Number(r[0].desconto_total_max_pct);
    const regras: RegrasCashback = {
      ganhoMinPct: pcts.length ? Math.min(...pcts) : REGRAS_PADRAO.ganhoMinPct,
      ganhoMaxPct: pcts.length ? Math.max(...pcts) : REGRAS_PADRAO.ganhoMaxPct,
      diasParaLiberar: r[0].dias_para_liberar ?? REGRAS_PADRAO.diasParaLiberar,
      validadeDias: r[0].validade_dias ?? REGRAS_PADRAO.validadeDias,
      tetoUsoPct: Number.isFinite(teto) && teto > 0 ? teto : REGRAS_PADRAO.tetoUsoPct,
      compraMinima: 0,
      exemplo: false,
    };
    cache = { em: Date.now(), regras };
    return regras;
  } catch (e) {
    console.error("regrasCashback: leitura falhou, usando o padrão", e instanceof Error ? e.message : e);
    return REGRAS_PADRAO;
  }
}
