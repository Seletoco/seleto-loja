import { test } from "node:test";
import assert from "node:assert/strict";
import { minutosDoPix, precisaConferir } from "./pagamentos";

test("validade do Pix: padrão 2 h, ajustável entre 15 min e 24 h", () => {
  assert.equal(minutosDoPix({}), 120);
  assert.equal(minutosDoPix({ REDE_PIX_MINUTOS: "30" }), 30);
  assert.equal(minutosDoPix({ REDE_PIX_MINUTOS: "5" }), 120);
  assert.equal(minutosDoPix({ REDE_PIX_MINUTOS: "9999" }), 120);
});

test("só reconsulta a Rede depois de 15 s", () => {
  assert.equal(precisaConferir(null, 1000), true);
  assert.equal(precisaConferir(new Date(0), 10_000), false);
  assert.equal(precisaConferir(new Date(0), 16_000), true);
});

import { whereDosFiltros } from "./pedidos-admin";

test("filtros do painel: só parâmetros, nunca texto do usuário no SQL", () => {
  const w = whereDosFiltros({ status: "pago", loja: 14, busca: "maria'; drop table x;--", dias: 7 });
  assert.ok(!w.sql.includes("maria"));
  assert.ok(!w.sql.includes("drop"));
  assert.equal(w.params[0], "pago");
  assert.equal(w.params[1], 14);
  assert.equal(w.params[2], 7);
  assert.ok(String(w.params[3]).includes("maria"));
  assert.deepEqual(whereDosFiltros({ status: "inventado" }), { sql: "", params: [] });
  const tel = whereDosFiltros({ busca: "(21) 99999" });
  assert.ok(tel.sql.includes("regexp_replace"));
  assert.equal(whereDosFiltros({ busca: "42" }).params.includes(42), true);
});
