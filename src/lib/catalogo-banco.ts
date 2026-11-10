/** Lê o catálogo do banco (views `loja.v_produtos` e `loja.v_variacoes`, só leitura) e monta os produtos da vitrine. */
import { db } from "./db";
import { montarCatalogo, type LinhaProduto, type LinhaVariacao } from "./catalogo-montar";
import type { Produto } from "./tipos";

export async function lerCatalogoDoBanco(antigo: Map<string, Produto>, exigirFoto: boolean): Promise<Produto[]> {
  const banco = db();
  const [prods, vars] = await Promise.all([
    banco.query<LinhaProduto>(`SELECT ref, nome, marca, categoria, preco::text AS preco, preco_de::text AS preco_de FROM loja.v_produtos`),
    banco.query<LinhaVariacao>(`SELECT produto_ref, cor, tamanho FROM loja.v_variacoes WHERE vendavel`),
  ]);

  // Opcionais (migration 011). Sem elas, vale a foto e o "novo" do arquivo antigo.
  const fotos = new Map<string, string>();
  try {
    const { rows } = await banco.query<{ ref: string; url: string }>(`SELECT ref, url FROM loja.v_fotos`);
    for (const r of rows) if (r.url) fotos.set(r.ref, r.url);
  } catch {
    /* view ainda não existe */
  }
  let novos: Set<string> | null = null;
  try {
    const { rows } = await banco.query<{ ref: string }>(`SELECT ref FROM loja.v_produtos_novos WHERE novo`);
    novos = new Set(rows.map((r) => r.ref));
  } catch {
    /* view ainda não existe */
  }

  return montarCatalogo(prods.rows, vars.rows, fotos, novos, antigo, exigirFoto);
}
