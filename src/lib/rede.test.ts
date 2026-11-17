import { test } from "node:test";
import assert from "node:assert/strict";
import { configDaRede, lerToken, mensagemDeErro, pedidoDeToken, resumoDaConfig } from "./rede";

test("sem REDE_AMBIENTE fica no sandbox; produção só quando pedido", () => {
  assert.equal(configDaRede({}).ambiente, "sandbox");
  assert.equal(configDaRede({ REDE_AMBIENTE: "producao" }).ambiente, "producao");
  assert.equal(configDaRede({ REDE_AMBIENTE: "Produção" }).ambiente, "producao");
  assert.equal(configDaRede({ REDE_AMBIENTE: "qualquer" }).ambiente, "sandbox");
});

test("resumo mostra só se existe, nunca o valor", () => {
  const r = resumoDaConfig(configDaRede({ REDE_CLIENT_ID: "abc", REDE_CLIENT_SECRET: "segredo", REDE_ATIVO: "1" }));
  assert.deepEqual(r, { ambiente: "sandbox", ativo: true, temClientId: true, temClientSecret: true, temPv: false, pronto: true });
  assert.ok(!JSON.stringify(r).includes("segredo"));
});

test("pedido de token: POST no /oauth2/token do ambiente, Basic e client_credentials", () => {
  const { url, init } = pedidoDeToken(configDaRede({ REDE_CLIENT_ID: "id", REDE_CLIENT_SECRET: "sec" }));
  assert.equal(url, "https://rl7-sandbox-api.useredecloud.com.br/oauth2/token");
  assert.equal(init.method, "POST");
  assert.equal((init.headers as Record<string, string>).Authorization, `Basic ${Buffer.from("id:sec").toString("base64")}`);
  assert.equal(init.body, "grant_type=client_credentials");
  const prod = pedidoDeToken(configDaRede({ REDE_AMBIENTE: "producao", REDE_CLIENT_ID: "id", REDE_CLIENT_SECRET: "sec" }));
  assert.equal(prod.url, "https://api.userede.com.br/redelabs/oauth2/token");
});

test("lê o token e desconta 60 s da validade", () => {
  assert.deepEqual(lerToken({ access_token: "t", expires_in: 3600 }, 1000), { accessToken: "t", expiraEmMs: 1000 + 3540 * 1000 });
  assert.equal(lerToken({}, 0), null);
  assert.equal(lerToken(null, 0), null);
});

test("mensagens de erro não repetem nada sensível e explicam o 401", () => {
  assert.match(mensagemDeErro(401, "x"), /recusou as credenciais/);
  assert.match(mensagemDeErro(0, ""), /Sem resposta/);
  assert.equal(mensagemDeErro(500, "a".repeat(500)).length < 200, true);
});
