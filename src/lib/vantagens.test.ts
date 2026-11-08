import { test } from "node:test";
import assert from "node:assert/strict";
import { faixaCashback } from "./vantagens";

test("calcula a faixa pelos percentuais do sistema, arredondando para baixo", () => {
  assert.deepEqual(faixaCashback(199.99, 10, 15), { min: 19.99, max: 29.99 });
  assert.deepEqual(faixaCashback(100, 10, 10), { min: 10, max: 10 });
});

test("ignora valor ou percentual inválido", () => {
  assert.equal(faixaCashback(0, 10, 15), null);
  assert.equal(faixaCashback(-10, 10, 15), null);
  assert.equal(faixaCashback(100, 0, 15), null);
  assert.equal(faixaCashback(100, 15, 10), null);
});
