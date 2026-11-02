import { test } from "node:test";
import assert from "node:assert/strict";
import { cepValido, embalagemDoPedido, estimativaDeExemplo, ufDoCep } from "./frete";

test("UF pelo CEP", () => {
  assert.equal(ufDoCep("20040-020"), "RJ");
  assert.equal(ufDoCep("01310100"), "SP");
  assert.equal(ufDoCep("40020000"), "BA");
  assert.equal(ufDoCep("69900-000"), "AC");
  assert.equal(ufDoCep("123"), null);
});

test("CEP válido tem 8 dígitos", () => {
  assert.equal(cepValido("20040-020"), true);
  assert.equal(cepValido("2004002"), false);
  assert.equal(cepValido("00000000"), false);
});

test("embalagem soma peso e altura e respeita os mínimos", () => {
  const e = embalagemDoPedido([{ categoria: "Camisetas", quantidade: 2 }, { categoria: "Tênis", quantidade: 1 }]);
  assert.equal(e.pesoG, 300 * 2 + 1200);
  assert.ok(e.altura >= 2 && e.comprimento >= 16 && e.largura >= 11);
  assert.ok(e.comprimento + e.largura + e.altura <= 200);
  const vazio = embalagemDoPedido([]);
  assert.deepEqual([vazio.comprimento, vazio.largura, vazio.altura], [16, 11, 2]);
});

test("estimativa de exemplo: mais longe e mais pesado custa mais; SEDEX é mais rápido e mais caro", () => {
  const leve = embalagemDoPedido([{ categoria: "Camisetas", quantidade: 1 }]);
  const pesado = embalagemDoPedido([{ categoria: "Tênis", quantidade: 3 }]);
  const rj = estimativaDeExemplo("RJ", leve);
  const am = estimativaDeExemplo("AM", leve);
  assert.ok(am[0].valor > rj[0].valor);
  assert.ok(estimativaDeExemplo("RJ", pesado)[0].valor > rj[0].valor);
  assert.ok(rj[1].valor > rj[0].valor && rj[1].prazoDias < rj[0].prazoDias);
  assert.ok(rj.every((o) => o.exemplo));
});
