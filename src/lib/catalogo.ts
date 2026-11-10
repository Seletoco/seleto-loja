/**
 * Fonte dos produtos da loja.
 *
 * Com o banco ligado, os produtos, o preço, a promoção e os tamanhos VENDÁVEIS (2+ em estoque nas 4 lojas) vêm das views
 * `loja.v_produtos` / `loja.v_variacoes` (só leitura), guardados em memória por 5 minutos. A foto vem do banco quando existe
 * (migration 011) ou do arquivo `data/produtos.json` (instantâneo antigo do catálogo). Sem banco, ou se a leitura falhar,
 * o site usa esse arquivo e segue funcionando. As funções abaixo continuam síncronas: as páginas chamam
 * `await garantirCatalogo()` antes de usá-las. `CATALOGO_DO_BANCO=0` (na Vercel) volta para o arquivo na hora.
 */
import dados from "../../data/produtos.json";
import { bancoLigado } from "./db";
import { lerCatalogoDoBanco } from "./catalogo-banco";
import type { Produto } from "./tipos";

const ARQUIVO = dados as Produto[];
const ARQUIVO_POR_REF = new Map(ARQUIVO.map((p) => [p.ref, p]));
let TODOS: Produto[] = ARQUIVO;

const VALIDADE_MS = 5 * 60_000; // o estoque do banco já atrasa horas; 5 minutos de cache não pesa
const NOVA_TENTATIVA_MS = 30_000; // se a leitura falhar, usa o arquivo e tenta de novo em 30 s
const MINIMO_DE_PRODUTOS = 200; // lista pequena demais = leitura suspeita: não troca o catálogo
let fonte: "banco" | "arquivo" = "arquivo";
let leuEm = 0;
let tentouEm = 0;
let ultimoErro: string | null = null;
let emCurso: Promise<void> | null = null;

/** O catálogo do banco está desligado de propósito? (`CATALOGO_DO_BANCO=0`) */
const desligado = () => process.env.CATALOGO_DO_BANCO === "0";

/**
 * Chame antes de usar o catálogo numa página ou rota. Na primeira vez espera a leitura; depois entrega o que já tem
 * e atualiza em segundo plano quando passa de 5 minutos. Nunca lança: em caso de erro, o catálogo antigo continua valendo.
 */
export async function garantirCatalogo(): Promise<void> {
  if (!bancoLigado() || desligado()) return;
  const agora = Date.now();
  if (fonte === "banco" && agora - leuEm < VALIDADE_MS) return;
  if (fonte !== "banco" && agora - tentouEm < NOVA_TENTATIVA_MS) return;
  if (!emCurso) {
    tentouEm = agora;
    emCurso = (async () => {
      try {
        const lista = await lerCatalogoDoBanco(ARQUIVO_POR_REF, process.env.CATALOGO_SEM_FOTO !== "1");
        if (lista.length >= MINIMO_DE_PRODUTOS) {
          TODOS = lista;
          fonte = "banco";
          leuEm = Date.now();
          ultimoErro = null;
        } else {
          ultimoErro = `leitura trouxe só ${lista.length} produtos (mínimo ${MINIMO_DE_PRODUTOS}); mantive o catálogo anterior`;
        }
      } catch (e) {
        ultimoErro = e instanceof Error ? e.message : String(e);
        console.error("catálogo: leitura do banco falhou, mantendo o anterior:", ultimoErro);
      } finally {
        emCurso = null;
      }
    })();
  }
  if (fonte !== "banco") await emCurso;
}

/** Para o painel admin conferir de onde vem o catálogo agora. */
export const statusDoCatalogo = () => ({
  fonte,
  produtos: TODOS.length,
  comFoto: TODOS.filter((p) => p.foto).length,
  atualizadoEm: leuEm || null,
  erro: ultimoErro,
  desligado: desligado(),
});

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

/** Tudo que o menu do topo precisa (calculado no servidor, entregue pronto ao cabeçalho). */
export interface DadosMenu {
  roupas: string[];
  acessorios: string[];
  marcas: string[];
  destaques: Produto[];
}
export function dadosMenu(): DadosMenu {
  const cats = categorias().map((c) => c.valor);
  const tem = (c: string) => cats.includes(c);
  return {
    roupas: ["Camisetas", "Shorts", "Calças", "Casacos e Moletons"].filter(tem),
    acessorios: ["Bonés", "Chinelos", "Bolsas e Mochilas", "Outros"].filter(tem),
    marcas: marcas().slice(0, 12).map((m) => m.valor),
    destaques: promocoes(2),
  };
}

/** Foto representativa de cada categoria (para os blocos "Compre por categoria"). */
export function fotoDaCategoria(cat: string): string | null {
  const melhor = buscar({ categoria: cat, ordem: "novo" }).find((p) => p.foto);
  return melhor?.foto ?? null;
}

export function maiorDesconto(): number {
  return Math.max(0, ...TODOS.map((p) => (p.precoDe ? Math.round(((p.precoDe - p.preco) / p.precoDe) * 100) : 0)));
}

export const melhorOferta = (): Produto | null => promocoes(1)[0] ?? null;
export const tenisEmOferta = (): Produto | null => buscar({ categoria: "Tênis", promo: true, ordem: "promo" }).find((p) => p.foto) ?? null;
