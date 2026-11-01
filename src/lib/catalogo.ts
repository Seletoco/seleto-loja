/**
 * Fonte dos produtos da loja.
 *
 * Hoje lê o instantâneo `data/produtos.json` (gerado do catálogo, só para o site de teste).
 * Em produção a mesma interface passa a ler as views `loja.v_produtos` / `loja.v_variacoes`
 * do Supabase, só em leitura — ver `supabase/migrations`. As páginas não mudam.
 */
import dados from "../../data/produtos.json";
import type { Produto } from "./tipos";

const TODOS = dados as Produto[];

export type Ordem = "relevancia" | "menor" | "maior" | "promo" | "novo";

export interface Filtro {
  q?: string;
  categoria?: string;
  marca?: string;
  tamanho?: string;
  promo?: boolean;
  ordem?: Ordem;
}

const semAcento = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export function buscar(f: Filtro): Produto[] {
  const q = f.q ? semAcento(f.q).split(/\s+/).filter(Boolean) : [];
  let lista = TODOS.filter((p) => {
    if (f.categoria && p.categoria !== f.categoria) return false;
    if (f.marca && p.marca !== f.marca) return false;
    if (f.tamanho && !p.tamanhos.includes(f.tamanho)) return false;
    if (f.promo && !p.precoDe) return false;
    if (q.length) {
      const texto = semAcento(`${p.nome} ${p.marca} ${p.cor} ${p.categoria}`);
      return q.every((palavra) => texto.includes(palavra));
    }
    return true;
  });
  const desc = (p: Produto) => (p.precoDe ? (p.precoDe - p.preco) / p.precoDe : 0);
  if (f.ordem === "menor") lista = [...lista].sort((a, b) => a.preco - b.preco);
  else if (f.ordem === "maior") lista = [...lista].sort((a, b) => b.preco - a.preco);
  else if (f.ordem === "promo") lista = [...lista].sort((a, b) => desc(b) - desc(a));
  else if (f.ordem === "novo") lista = [...lista].sort((a, b) => Number(b.novo) - Number(a.novo));
  return lista;
}

export const produtoPorRef = (ref: string) => TODOS.find((p) => p.ref === ref);

function contar(chave: (p: Produto) => string): { valor: string; n: number }[] {
  const m = new Map<string, number>();
  for (const p of TODOS) m.set(chave(p), (m.get(chave(p)) ?? 0) + 1);
  return [...m].map(([valor, n]) => ({ valor, n })).sort((a, b) => b.n - a.n);
}

export const categorias = () => contar((p) => p.categoria);
export const marcas = () => contar((p) => p.marca);

export function tamanhosDisponiveis(): string[] {
  const t = new Set<string>();
  for (const p of TODOS) p.tamanhos.forEach((x) => t.add(x));
  return [...t].sort((a, b) => (isNaN(+a) || isNaN(+b) ? a.localeCompare(b) : +a - +b));
}

export const novidades = (n = 8) => TODOS.filter((p) => p.novo && p.foto).slice(0, n);
export const promocoes = (n = 8) =>
  buscar({ promo: true, ordem: "promo" })
    .filter((p) => p.foto)
    .slice(0, n);

export function relacionados(p: Produto, n = 4): Produto[] {
  return TODOS.filter((x) => x.ref !== p.ref && x.categoria === p.categoria && x.marca === p.marca && x.foto).slice(0, n);
}

/**
 * Produtos do carrossel da home: maiores descontos com foto, no máximo 1 por marca e categoria
 * (senão o carrossel vira só chinelo). Se faltar, completa com novidades.
 */
export function destaques(n = 5): Produto[] {
  const vistos = new Set<string>();
  const saida: Produto[] = [];
  const candidatos = [...buscar({ promo: true, ordem: "promo" }), ...TODOS.filter((p) => p.novo)].filter((p) => p.foto);
  for (const p of candidatos) {
    const chave = `${p.marca}|${p.categoria}`;
    if (vistos.has(chave) || saida.some((x) => x.ref === p.ref)) continue;
    vistos.add(chave);
    saida.push(p);
    if (saida.length === n) break;
  }
  return saida;
}
