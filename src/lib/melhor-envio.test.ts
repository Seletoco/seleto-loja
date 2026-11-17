import { test } from "node:test";
import assert from "node:assert/strict";
import { ambienteDoMelhorEnvio, corpoDaCotacao, lerOpcoes, melhorEnvioConfigurado } from "./melhor-envio";

test("só liga com token e e-mail de contato", () => {
  assert.equal(melhorEnvioConfigurado({}), false);
  assert.equal(melhorEnvioConfigurado({ MELHOR_ENVIO_TOKEN: "t" }), false);
  assert.equal(melhorEnvioConfigurado({ MELHOR_ENVIO_TOKEN: "t", MELHOR_ENVIO_EMAIL: "a@b.com" }), true);
  assert.equal(ambienteDoMelhorEnvio({}), "producao");
  assert.equal(ambienteDoMelhorEnvio({ MELHOR_ENVIO_AMBIENTE: "Sandbox" }), "sandbox");
});

test("corpo: peso em kg, medidas inteiras, valor declarado com 2 casas", () => {
  const c = corpoDaCotacao("22631004", "01001000", { pesoG: 1250, comprimento: 32.2, largura: 22, altura: 5.5 }, 199.999);
  assert.equal(c.from.postal_code, "22631004");
  assert.equal(c.to.postal_code, "01001000");
  assert.deepEqual(c.products[0], { id: "pedido", width: 22, height: 6, length: 33, weight: 1.25, insurance_value: 200, quantity: 1 });
});

test("opções: usa custom_price, ignora erro/sem preço, ordena e limita", () => {
  const r = lerOpcoes(
    [
      { id: 2, name: "SEDEX", custom_price: "42.10", price: "50.00", custom_delivery_time: 2, company: { name: "Correios" } },
      { id: 1, name: "PAC", custom_price: "21,50", price: "30.00", custom_delivery_time: 6, company: { name: "Correios" } },
      { id: 3, name: ".Package", price: "19.90", delivery_time: 5, company: { name: "Jadlog" } },
      { id: 4, name: ".Com", error: "Serviço indisponível", price: "10", delivery_time: 3, company: { name: "Jadlog" } },
      { id: 17, name: "Mini Envios", price: "0", delivery_time: 5, company: { name: "Correios" } },
      { id: 9, name: "Sem prazo", price: "12", company: { name: "X" } },
    ],
    2,
  );
  assert.equal(r.length, 2);
  assert.deepEqual(r.map((o) => [o.servico, o.nome, o.valor, o.prazoDias, o.exemplo]), [
    ["ME3", "Jadlog .Package", 19.9, 5, false],
    ["ME1", "Correios PAC", 21.5, 6, false],
  ]);
  assert.deepEqual(lerOpcoes(null), []);
  assert.deepEqual(lerOpcoes({ message: "x" }), []);
});
