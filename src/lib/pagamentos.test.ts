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
