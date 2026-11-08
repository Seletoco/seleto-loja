import { test } from "node:test";
import assert from "node:assert/strict";
import { cashbackGanho } from "./vantagens";

test("não promete valor quando o percentual não foi definido", () => {
  assert.equal(cashbackGanho(500, null), null);
});

test("calcula pelo percentual, arredondando para baixo", () => {
  assert.equal(cashbackGanho(199.99, 5), 9.99);
  assert.equal(cashbackGanho(100, 10), 10);
});

test("ignora valor inválido", () => {
  assert.equal(cashbackGanho(0, 5), null);
  assert.equal(cashbackGanho(-10, 5), null);
});
