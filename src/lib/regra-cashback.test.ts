import { test } from "node:test";
import assert from "node:assert/strict";
import { situacaoDoCashback, type RegraDeUso } from "./regra-cashback";

const regra: RegraDeUso = { compraMinima: 500, tetoPercentualDaCompra: 100, exemplo: true };
const HOJE = "2026-11-02";
const lista = [
  { valor: 46.5, liberaEm: "2026-10-30", venceEm: "2026-11-29" }, // liberado
  { valor: 80, liberaEm: "2026-11-06", venceEm: "2026-12-06" }, // em carência
  { valor: 30, liberaEm: "2026-09-01", venceEm: "2026-10-01" }, // vencido
];

test("separa liberado, em carência e vencido", () => {
  const s = situacaoDoCashback(lista, 600, HOJE, regra);
  assert.equal(s.disponivel, 46.5);
  assert.equal(s.aLiberar, 80);
  assert.equal(s.proximaLiberacao, "2026-11-06");
});

test("só utiliza a partir da compra mínima", () => {
  const abaixo = situacaoDoCashback(lista, 499.99, HOJE, regra);
  assert.equal(abaixo.utilizavel, 0);
  assert.equal(abaixo.bloqueadoPeloMinimo, true);
  assert.equal(abaixo.faltaParaMinimo, 0.01);
  const acima = situacaoDoCashback(lista, 500, HOJE, regra);
  assert.equal(acima.utilizavel, 46.5);
  assert.equal(acima.faltaParaMinimo, 0);
  assert.equal(acima.bloqueadoPeloMinimo, false);
});

test("o teto limita o quanto cobre do pedido", () => {
  const metade: RegraDeUso = { ...regra, tetoPercentualDaCompra: 5 };
  assert.equal(situacaoDoCashback([{ valor: 100, liberaEm: "2026-10-01", venceEm: "2026-12-01" }], 600, HOJE, metade).utilizavel, 30);
});

test("sem cashback", () => {
  const s = situacaoDoCashback([], 800, HOJE, regra);
  assert.equal(s.utilizavel, 0);
  assert.equal(s.bloqueadoPeloMinimo, false);
});
