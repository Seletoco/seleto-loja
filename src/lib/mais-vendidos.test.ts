import { test } from "node:test";
import assert from "node:assert/strict";
import { mapaDeVendidos, ordenarPorVendidos } from "./mais-vendidos";
import type { Produto } from "./tipos";

const p = (ref: string, foto: string | null = "f"): Produto => ({ ref, nome: ref, marca: "m", categoria: "c", cor: "", tamanhos: ["40"], preco: 10, precoDe: null, foto, novo: false });

test("soma por produto e ignora linhas inválidas", () => {
  const m = mapaDeVendidos([{ ref: "A", vendidos: 3 }, { ref: "A", vendidos: 2 }, { ref: "B", vendidos: 0 }, { ref: "", vendidos: 5 }, { ref: "C", vendidos: Number.NaN }]);
  assert.deepEqual([...m], [["A", 5]]);
});

test("ordena do mais vendido ao menos e tira quem não vendeu", () => {
  const m = new Map([["A", 5], ["B", 9], ["C", 5]]);
  const r = ordenarPorVendidos([p("A"), p("B"), p("C"), p("D")], m).map((x) => x.ref);
  assert.deepEqual(r, ["B", "A", "C"]);
});

test("empate: quem tem foto vem primeiro", () => {
  const m = new Map([["A", 5], ["B", 5]]);
  assert.deepEqual(ordenarPorVendidos([p("A", null), p("B", "f")], m).map((x) => x.ref), ["B", "A"]);
});
