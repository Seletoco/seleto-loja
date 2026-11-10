/** Monta os produtos da vitrine a partir das linhas do banco. Pura (sem banco): quem lê o banco é `catalogo-banco.ts`. */
import { bonitoCor, bonitoMarca, categoriaDoSite, limparNome, ordenarTamanhos } from "./catalogo-nomes";
import type { Produto } from "./tipos";

export interface LinhaProduto {
  ref: string;
  nome: string;
  marca: string | null;
  categoria: string | null;
  preco: string | number | null;
  preco_de: string | number | null;
}
export interface LinhaVariacao {
  produto_ref: string;
  cor: string | null;
  tamanho: string | null;
}

const dinheiro = (v: string | number | null): number => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
};

/**
 * - preço, promoção, tamanhos e cores vêm do banco (só variação vendável: 2+ em estoque nas 4 lojas);
 * - foto: a do banco (`fotos`) e, se não houver, a do arquivo antigo (`antigo`); sem foto nenhuma o produto só entra se `exigirFoto` for falso;
 * - "novo": o do banco (`novos`, ou null se a informação não existe) e, sem ele, o do arquivo antigo.
 */
export function montarCatalogo(
  produtos: LinhaProduto[],
  variacoes: LinhaVariacao[],
  fotos: Map<string, string>,
  novos: Set<string> | null,
  antigo: Map<string, Produto>,
  exigirFoto: boolean,
): Produto[] {
  const porRef = new Map<string, LinhaVariacao[]>();
  for (const v of variacoes) {
    const l = porRef.get(v.produto_ref);
    if (l) l.push(v);
    else porRef.set(v.produto_ref, [v]);
  }

  const saida: Produto[] = [];
  for (const p of produtos) {
    const preco = dinheiro(p.preco);
    const vars = porRef.get(p.ref) ?? [];
    const tamanhos = ordenarTamanhos(vars.map((v) => v.tamanho ?? ""));
    if (!(preco > 0) || tamanhos.length === 0) continue;

    const velho = antigo.get(p.ref);
    const foto = fotos.get(p.ref) ?? velho?.foto ?? null;
    if (exigirFoto && !foto) continue;

    const precoDe = dinheiro(p.preco_de);
    const cores = [...new Set(vars.map((v) => bonitoCor(v.cor)).filter(Boolean))];
    saida.push({
      ref: p.ref,
      nome: limparNome(p.nome),
      marca: bonitoMarca(p.marca),
      categoria: categoriaDoSite(p.categoria),
      cor: cores.join(" / "),
      tamanhos,
      preco,
      precoDe: precoDe > preco ? precoDe : null,
      foto,
      novo: novos ? novos.has(p.ref) : (velho?.novo ?? false),
    });
  }
  return saida;
}
