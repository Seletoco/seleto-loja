import { test } from "node:test";
import assert from "node:assert/strict";
import { capturaLigada, ocultar, paramsOcultos, respostaDeCaptura } from "./tray-captura";

test("só liga com TRAY_CAPTURA=1", () => {
  assert.equal(capturaLigada({}), false);
  assert.equal(capturaLigada({ TRAY_CAPTURA: "0" }), false);
  assert.equal(capturaLigada({ TRAY_CAPTURA: "1" }), true);
});

test("segredos, códigos e tokens nunca aparecem no log", () => {
  const o = ocultar({ consumer_key: "abc", consumer_secret: "xyz", code: "123", access_token: "t", nome: "loja", aninhado: { Password: "p", id: 7 } }) as Record<string, unknown>;
  assert.equal(o.consumer_key, "[oculto]");
  assert.equal(o.consumer_secret, "[oculto]");
  assert.equal(o.code, "[oculto]");
  assert.equal(o.access_token, "[oculto]");
  assert.equal(o.nome, "loja");
  assert.deepEqual(o.aninhado, { Password: "[oculto]", id: 7 });
  const q = paramsOcultos(new URL("https://x.com/a?response_type=code&consumer_key=k&callback=http://localhost:1/x"));
  assert.deepEqual(q, { response_type: "code", consumer_key: "[oculto]", callback: "http://localhost:1/x" });
});

test("respostas mínimas: auth devolve token de captura; pedidos vêm vazios", () => {
  const a = respostaDeCaptura("POST", "auth", "https://loja.exemplo");
  assert.equal(a.status, 200);
  assert.equal((a.json as { api_host: string }).api_host, "https://loja.exemplo/web_api");
  assert.deepEqual((respostaDeCaptura("GET", "orders", "x").json as { Orders: unknown[] }).Orders, []);
  assert.deepEqual((respostaDeCaptura("GET", "orders/statuses", "x").json as { OrderStatuses: unknown[] }).OrderStatuses, []);
});
