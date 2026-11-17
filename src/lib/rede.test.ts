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

test("o PV vale como clientId quando REDE_CLIENT_ID não existe", () => {
  assert.equal(configDaRede({ REDE_PV: "12345", REDE_CLIENT_SECRET: "k" }).clientId, "12345");
  assert.equal(configDaRede({ REDE_PV: "12345", REDE_CLIENT_ID: "999", REDE_CLIENT_SECRET: "k" }).clientId, "999");
  assert.equal(resumoDaConfig(configDaRede({ REDE_PV: "12345", REDE_CLIENT_SECRET: "k" })).pronto, true);
});

import { corpoPix, horaDeBrasilia, lerAvisoPix, lerConsultaPix, lerRespostaPix, podeCobrar, referenciaDoPedido } from "./rede";

test("Pix: cobrar só no sandbox ou em produção com REDE_ATIVO=1", () => {
  const cred = { REDE_PV: "1", REDE_CLIENT_SECRET: "k" };
  assert.equal(podeCobrar(configDaRede(cred)), true);
  assert.equal(podeCobrar(configDaRede({ ...cred, REDE_AMBIENTE: "producao" })), false);
  assert.equal(podeCobrar(configDaRede({ ...cred, REDE_AMBIENTE: "producao", REDE_ATIVO: "1" })), true);
  assert.equal(podeCobrar(configDaRede({})), false);
});

test("Pix: referência com até 16 caracteres alfanuméricos e única por instante", () => {
  const r = referenciaDoPedido(123456, 1_794_000_000_000);
  assert.match(r, /^[A-Za-z0-9]{1,16}$/);
  assert.ok(r.startsWith("SL123456"));
  assert.notEqual(referenciaDoPedido(1, 1000), referenciaDoPedido(1, 2000));
});

test("Pix: vencimento em hora de Brasília no formato da Rede", () => {
  assert.equal(horaDeBrasilia(Date.UTC(2026, 10, 17, 15, 5, 9)), "2026-11-17T12:05:09");
  const c = corpoPix("SL1x", 3990, Date.UTC(2026, 0, 1, 3, 0, 0));
  assert.deepEqual(c, { kind: "pix", reference: "SL1x", amount: 3990, qrCode: { dateTimeExpiration: "2026-01-01T00:00:00" } });
});

test("Pix: lê a resposta do QR Code (exemplo do manual)", () => {
  const ok = lerRespostaPix({ reference: "pix1", tid: "40402307310827210012", amount: 3900, qrCodeResponse: { dateTimeExpiration: "2023-08-30T16:48:00-03:00", qrCodeData: "000201...", qrCodeImage: "iVBOR" }, returnCode: "00", returnMessage: "Success." });
  assert.equal(ok.ok, true);
  assert.equal(ok.tid, "40402307310827210012");
  assert.equal(ok.emv, "000201...");
  const ruim = lerRespostaPix({ returnCode: "3025", returnMessage: "Erro" });
  assert.equal(ruim.ok, false);
  assert.equal(ruim.codigo, "3025");
});

test("Pix: consulta pendente, aprovada, cancelada e vencida", () => {
  assert.equal(lerConsultaPix({ qrCodeResponse: { status: "Pending", returnCode: "00" } }).status, "pendente");
  assert.equal(lerConsultaPix({ authorization: { status: "Approved", returnCode: "00" } }).status, "pago");
  assert.equal(lerConsultaPix({ authorization: { status: "Canceled" } }).status, "cancelado");
  assert.equal(lerConsultaPix({ returnCode: "3036", returnMessage: "QrCode Expired" }).status, "expirado");
  assert.equal(lerConsultaPix({}).status, null);
});

test("Pix: aviso da Rede (webhook) dá o TID e os eventos", () => {
  assert.deepEqual(lerAvisoPix({ merchantId: "90104480", events: ["PV.UPDATE_TRANSACTION_PIX"], data: { txid: "X", id: "40402508050758050105", endToEndId: "E0" } }), { tid: "40402508050758050105", eventos: ["PV.UPDATE_TRANSACTION_PIX"] });
  assert.deepEqual(lerAvisoPix({ events: ["PV.REFUND_PIX"], data: { qrcode: "41412312010933570004" } }), { tid: "41412312010933570004", eventos: ["PV.REFUND_PIX"] });
  assert.deepEqual(lerAvisoPix({ data: { id: "'; drop table" } }), { tid: null, eventos: [] });
});

import { lerRespostaDevolucao } from "./rede";

test("Pix: devolução só vale com o código 359 (manual)", () => {
  assert.deepEqual(lerRespostaDevolucao({ refundDateTime: "2023-09-19T12:12:03-03:00", returnCode: "359", returnMessage: "Refund successful." }), { ok: true, codigo: "359", mensagem: "Refund successful." });
  assert.equal(lerRespostaDevolucao({ returnCode: "3091", returnMessage: "Error" }).ok, false);
  assert.equal(lerRespostaDevolucao(null).ok, false);
});
