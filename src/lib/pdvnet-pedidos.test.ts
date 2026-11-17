import { test } from "node:test";
import assert from "node:assert/strict";
import { atrasoDaLiberacao, liberacaoAutomatica, podeLiberar } from "./pdvnet-pedidos";

test("liberação automática só liga com PDVNET_AUTO_LIBERAR=1", () => {
  assert.equal(liberacaoAutomatica({}), false);
  assert.equal(liberacaoAutomatica({ PDVNET_AUTO_LIBERAR: "0" }), false);
  assert.equal(liberacaoAutomatica({ PDVNET_AUTO_LIBERAR: "1" }), true);
});

test("atraso da liberação: padrão 10 min, aceita 0 a 1440", () => {
  assert.equal(atrasoDaLiberacao({}), 10);
  assert.equal(atrasoDaLiberacao({ PDVNET_AUTO_ATRASO_MIN: "" }), 10);
  assert.equal(atrasoDaLiberacao({ PDVNET_AUTO_ATRASO_MIN: "0" }), 0);
  assert.equal(atrasoDaLiberacao({ PDVNET_AUTO_ATRASO_MIN: "30" }), 30);
  assert.equal(atrasoDaLiberacao({ PDVNET_AUTO_ATRASO_MIN: "5000" }), 10);
  assert.equal(atrasoDaLiberacao({ PDVNET_AUTO_ATRASO_MIN: "-3" }), 10);
  assert.equal(atrasoDaLiberacao({ PDVNET_AUTO_ATRASO_MIN: "abc" }), 10);
});

test("liberação manual: só pedido pago, e entrega só com CPF", () => {
  const base = { status: "pago", pagamento_status: "confirmado", entrega_tipo: "retirada_loja", cliente_cpf: null, liberado: false };
  assert.equal(podeLiberar(base), null);
  assert.match(podeLiberar({ ...base, status: "aguardando_pagamento" }) ?? "", /não foi pago/);
  assert.match(podeLiberar({ ...base, status: "cancelado" }) ?? "", /cancelado/);
  assert.match(podeLiberar({ ...base, entrega_tipo: "entrega_combinada" }) ?? "", /CPF/);
  assert.equal(podeLiberar({ ...base, entrega_tipo: "entrega_combinada", cliente_cpf: "52998224725" }), null);
});
