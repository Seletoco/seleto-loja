/** Ranking "mais vendidos": só a ORDEM importa (a vitrine nunca mostra quantidade). Funções puras, sem banco. */
import type { Produto } from "./tipos";

export interface LinhaVendida {
  ref: string;
  vendidos: number;
}

/** ref -> quantidade vendida (ignora linhas inválidas). */
export function mapaDeVendidos(linhas: LinhaVendida[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const l of linhas) {
    const n = Number(l.vendidos);
    if (l.ref && Number.isFinite(n) && n > 0) m.set(l.ref, (m.get(l.ref) ?? 0) + n);
  }
  return m;
}

/**
 * Do mais para o menos vendido; empate decide pelo que tem foto e depois pela referência (ordem estável).
 * Só entram produtos que venderam: quem não vendeu nada não é "mais vendido".
 */
export function ordenarPorVendidos(produtos: Produto[], vendidos: Map<string, number>): Produto[] {
  return produtos
    .filter((p) => (vendidos.get(p.ref) ?? 0) > 0)
    .sort((a, b) => (vendidos.get(b.ref)! - vendidos.get(a.ref)!) || Number(Boolean(b.foto)) - Number(Boolean(a.foto)) || a.ref.localeCompare(b.ref));
}
