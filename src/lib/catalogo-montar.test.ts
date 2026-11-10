import { test } from "node:test";
import assert from "node:assert/strict";
import { montarCatalogo, type LinhaProduto, type LinhaVariacao } from "./catalogo-montar";
import type { Produto } from "./tipos";

const prod = (ref: string, extra: Partial<LinhaProduto> = {}): LinhaProduto => ({ ref, nome: "VR27 CAMISA NIKE MINI LOGO", marca: "NIKE", categoria: "CAMISETA", preco: "149.9900", preco_de: null, ...extra });
const vari = (ref: string, tamanho: string, cor = "PRETO"): LinhaVariacao => ({ produto_ref: ref, cor, tamanho });
const velho = (ref: string, extra: Partial<Produto> = {}): Produto => ({ ref, nome: "x", marca: "x", categoria: "x", cor: "", tamanhos: [], preco: 1, precoDe: null, foto: "https://f/velha.jpg", novo: true, ...extra });

test("monta o produto com preço, tamanhos e nome limpos", () => {
  const [p] = montarCatalogo([prod("A")], [vari("A", "M"), vari("A", "P"), vari("A", "G")], new Map(), null, new Map([["A", velho("A")]]), true);
  assert.equal(p.nome, "Camisa Nike Mini Logo");
  assert.equal(p.marca, "Nike");
  assert.equal(p.categoria, "Camisetas");
  assert.equal(p.cor, "Preto");
  assert.deepEqual(p.tamanhos, ["P", "M", "G"]);
  assert.equal(p.preco, 149.99);
  assert.equal(p.foto, "https://f/velha.jpg");
  assert.equal(p.novo, true); // sem informação do banco, vale a do arquivo antigo
});

test("promoção só quando o preço 'de' é maior", () => {
  const f = (de: string | null) => montarCatalogo([prod("A", { preco: "100", preco_de: de })], [vari("A", "M")], new Map(), null, new Map([["A", velho("A")]]), true)[0].precoDe;
  assert.equal(f("150"), 150);
  assert.equal(f("100"), null);
  assert.equal(f("90"), null);
  assert.equal(f(null), null);
});

test("foto do banco vence a do arquivo; sem foto nenhuma o produto sai (por padrão)", () => {
  const com = montarCatalogo([prod("A")], [vari("A", "M")], new Map([["A", "https://f/banco.jpg"]]), null, new Map([["A", velho("A")]]), true);
  assert.equal(com[0].foto, "https://f/banco.jpg");
  assert.equal(montarCatalogo([prod("B")], [vari("B", "M")], new Map(), null, new Map(), true).length, 0);
  assert.equal(montarCatalogo([prod("B")], [vari("B", "M")], new Map(), null, new Map(), false).length, 1);
});

test("'novo' vem do banco quando existe", () => {
  const f = (novos: Set<string> | null) => montarCatalogo([prod("A")], [vari("A", "M")], new Map(), novos, new Map([["A", velho("A", { novo: true })]]), true)[0].novo;
  assert.equal(f(new Set()), false);
  assert.equal(f(new Set(["A"])), true);
  assert.equal(f(null), true);
});

test("produto sem tamanho vendável ou sem preço não entra", () => {
  assert.equal(montarCatalogo([prod("A")], [], new Map([["A", "f"]]), null, new Map(), true).length, 0);
  assert.equal(montarCatalogo([prod("A", { preco: "0" })], [vari("A", "M")], new Map([["A", "f"]]), null, new Map(), true).length, 0);
  assert.equal(montarCatalogo([prod("A", { preco: null })], [vari("A", "M")], new Map([["A", "f"]]), null, new Map(), true).length, 0);
});
