import { test } from "node:test";
import assert from "node:assert/strict";
import { tratarTray, datasDoFiltro, type PedidoHttp } from "./tray-api";
import { configDaTray, credenciaisOk, emitirTokens, tokenValido } from "./tray-auth";
import type { BancoTray } from "./tray-banco";
import { achatarCorpo, acharVariacao, campo, lerNota, statusTray, type LinhaItem, type LinhaPedido, type Variacao } from "./tray-pedidos";

const ENV = { TRAY_CONSUMER_KEY: "chave-publica", TRAY_CONSUMER_SECRET: "segredo-do-app", TRAY_CODIGO: "codigo-longo-aleatorio", TRAY_SEGREDO_TOKEN: "assinatura-de-tokens-bem-longa" };
const cfg = configDaTray(ENV)!;
const AGORA = Date.parse("2026-11-17T20:00:00Z");

const linha = (n: number, extra: Partial<LinhaPedido> = {}): LinhaPedido => ({
  numero: String(n), criado_em: new Date("2026-11-17T15:00:00Z"), atualizado_em: new Date("2026-11-17T16:00:00Z"), status: "pago",
  cliente_nome: "Maria Souza", cliente_telefone: "21999990000", cliente_email: "m@x.com", cliente_cpf: "52998224725",
  entrega_tipo: "entrega_combinada", loja_retirada_id: null,
  endereco: { texto: "Rua A, 10", cep: "24000000", logradouro: "Rua A", numero: "10", complemento: "ap 2", bairro: "Centro", cidade: "Niterói", uf: "RJ" },
  pagamento_metodo: "pix", subtotal: "100.00", frete: "20.00", total: "110.00", cashback_usado: "10.00", entrega_servico: "Correios PAC",
  pdvnet_status: null, nota_chave: null, nota_numero: null, pago_em: new Date("2026-11-17T15:05:00Z"), ...extra,
});
const ITENS: LinhaItem[] = [{ produto_ref: "T1", nome: "Tênis X", cor: "Preto", tamanho: "40", quantidade: 1, preco_unit: "100.00" }];
const VARS: Variacao[] = [{ variacao_id: "77", produto_ref: "T1", cor: "Preto", tamanho: "40", ean: "7891234567895" }];

function bancoFalso(linhas: LinhaPedido[]) {
  const chamadas: string[] = [];
  const b: BancoTray = {
    liberados: async () => linhas,
    liberado: async (n) => linhas.find((l) => l.numero === String(n)) ?? null,
    itens: async () => ITENS,
    variacoes: async () => VARS,
    marcarBaixado: async (n) => void chamadas.push(`baixado:${n}`),
    gravarStatus: async (n, s) => (chamadas.push(`status:${n}:${s}`), linhas.some((l) => l.numero === String(n))),
    gravarNota: async (n, nota) => (chamadas.push(`nota:${n}:${nota.numero}:${nota.chave}`), linhas.some((l) => l.numero === String(n))),
  };
  return { b, chamadas };
}
const req = (metodo: string, caminho: string, q: Record<string, string> = {}, corpo = ""): PedidoHttp => ({ metodo, caminho, query: new URLSearchParams(q), corpo, origem: "https://loja.exemplo" });
const comToken = () => ({ access_token: emitirTokens(cfg, AGORA).access_token });

test("sem as quatro variáveis a API real fica desligada", () => {
  assert.equal(configDaTray({}), null);
  assert.equal(configDaTray({ ...ENV, TRAY_SEGREDO_TOKEN: "curto" }), null);
  assert.ok(cfg);
});

test("auth: só com chave, segredo e código certos; token assinado expira", async () => {
  const { b } = bancoFalso([]);
  const bom = await tratarTray(req("POST", "auth", {}, "consumer_key=chave-publica&consumer_secret=segredo-do-app&code=codigo-longo-aleatorio"), cfg, b, AGORA);
  assert.equal(bom.status, 200);
  const j = bom.json as { access_token: string; refresh_token: string; api_host: string };
  assert.equal(j.api_host, "https://loja.exemplo/web_api");
  assert.ok(tokenValido(cfg, j.access_token, "a", AGORA + 1000));
  assert.ok(!tokenValido(cfg, j.access_token, "a", AGORA + 2 * 3_600_000), "expira em 1 h");
  assert.ok(!tokenValido(cfg, j.access_token, "r", AGORA), "token de acesso não vale como renovação");
  assert.ok(!tokenValido(cfg, j.access_token.slice(0, -2) + "xx", "a", AGORA), "assinatura adulterada");
  for (const corpo of ["consumer_key=chave-publica&consumer_secret=errado&code=codigo-longo-aleatorio", "consumer_key=x&consumer_secret=segredo-do-app&code=codigo-longo-aleatorio", '{"consumer_key":"chave-publica","consumer_secret":"segredo-do-app","code":"x"}', ""]) {
    assert.equal((await tratarTray(req("POST", "auth", {}, corpo), cfg, b, AGORA)).status, 401);
  }
  const json = await tratarTray(req("POST", "auth", {}, JSON.stringify({ consumer_key: "chave-publica", consumer_secret: "segredo-do-app", code: "codigo-longo-aleatorio" })), cfg, b, AGORA);
  assert.equal(json.status, 200);
  const renov = await tratarTray(req("GET", "auth", { refresh_token: j.refresh_token }), cfg, b, AGORA + 3_600_000 * 5);
  assert.equal(renov.status, 200);
  assert.equal((await tratarTray(req("GET", "auth", { refresh_token: j.access_token }), cfg, b, AGORA)).status, 401);
  assert.ok(!credenciaisOk(cfg, { key: undefined, secret: undefined, code: undefined }));
});

test("sem token, tudo é 401; com token, só 'orders'", async () => {
  const { b } = bancoFalso([linha(1)]);
  assert.equal((await tratarTray(req("GET", "orders"), cfg, b, AGORA)).status, 401);
  assert.equal((await tratarTray(req("GET", "orders", { access_token: "a.9999999999999.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" }), cfg, b, AGORA)).status, 401);
  assert.equal((await tratarTray(req("GET", "customers", comToken()), cfg, b, AGORA)).status, 404);
});

test("lista só os pedidos liberados, filtra por status (id ou nome) e pagina", async () => {
  const { b } = bancoFalso([linha(3), linha(2, { pdvnet_status: "31" }), linha(1, { status: "cancelado" })]);
  const todos = (await tratarTray(req("GET", "orders", comToken()), cfg, b, AGORA)).json as { paging: { total: number }; Orders: { Order: { id: string } }[] };
  assert.equal(todos.paging.total, 3);
  const pagos = (await tratarTray(req("GET", "orders", { ...comToken(), status: "1" }), cfg, b, AGORA)).json as { Orders: { Order: { id: string } }[] };
  assert.deepEqual(pagos.Orders.map((o) => o.Order.id), ["3"]);
  const fat = (await tratarTray(req("GET", "orders", { ...comToken(), status: "Faturado" }), cfg, b, AGORA)).json as { Orders: { Order: { id: string } }[] };
  assert.deepEqual(fat.Orders.map((o) => o.Order.id), ["2"]);
  const pag = (await tratarTray(req("GET", "orders", { ...comToken(), limit: "1", page: "2" }), cfg, b, AGORA)).json as { paging: { page: number; limit: number }; Orders: { Order: { id: string } }[] };
  assert.equal(pag.Orders.length, 1);
  assert.equal(pag.paging.page, 2);
  const lista = JSON.stringify(todos);
  assert.ok(!lista.includes("52998224725"), "a lista não traz CPF");
  const mod = (await tratarTray(req("GET", "orders", { ...comToken(), modified: "2026-11-18" }), cfg, b, AGORA)).json as { Orders: unknown[] };
  assert.equal(mod.Orders.length, 0);
  assert.deepEqual(datasDoFiltro("[2026-11-01],[2026-11-17]"), { de: "2026-11-01", ate: "2026-11-17" });
});

test("pedido completo: cliente com CPF, itens por EAN com Cor e Tamanho, desconto do cashback, e marca como baixado", async () => {
  const { b, chamadas } = bancoFalso([linha(5)]);
  const r = await tratarTray(req("GET", "orders/5/complete", comToken()), cfg, b, AGORA);
  assert.equal(r.status, 200);
  type Vendido = { ProductsSold: { ean: string; variant_id: string; Sku: unknown } };
  const o = (r.json as { Order: Record<string, string> & { Customer: Record<string, string>; ProductsSold: Vendido[] } }).Order;
  assert.equal(o.id, "5");
  assert.equal(o.total, "110.00");
  assert.equal(o.partial_total, "100.00");
  assert.equal(o.discount, "10.00");
  assert.equal(o.shipment_value, "20.00");
  assert.equal(o.payment_method, "Pix");
  assert.equal(o.has_payment, "1");
  assert.equal(o.Customer.cpf, "52998224725");
  assert.equal(o.Customer.zip_code, "24000-000");
  assert.equal(o.Customer.city, "Niterói");
  assert.equal(o.ProductsSold[0].ProductsSold.ean, "7891234567895");
  assert.equal(o.ProductsSold[0].ProductsSold.variant_id, "77");
  assert.deepEqual(o.ProductsSold[0].ProductsSold.Sku, [{ type: "Cor", value: "Preto" }, { type: "Tamanho", value: "40" }]);
  assert.deepEqual(chamadas, ["baixado:5"]);
  assert.equal((await tratarTray(req("GET", "orders/999/complete", comToken()), cfg, b, AGORA)).status, 404);
  assert.equal((await tratarTray(req("GET", "orders/5", comToken()), cfg, b, AGORA)).status, 200);
});

test("PUT status e nota fiscal (formulário no estilo RestSharp e JSON)", async () => {
  const { b, chamadas } = bancoFalso([linha(5)]);
  const put = await tratarTray(req("PUT", "orders/5", comToken(), '%5B%22Order%22%5D%5B%22status_id%22%5D=31&%5B%22Order%22%5D%5B%22sending_code%22%5D=x'), cfg, b, AGORA);
  assert.equal(put.status, 200);
  assert.equal((await tratarTray(req("PUT", "orders/5", comToken(), "Order[status_id]=31"), cfg, b, AGORA)).status, 200);
  assert.equal((await tratarTray(req("PUT", "orders/5", comToken(), '{"Order":{"status_id":"31"}}'), cfg, b, AGORA)).status, 200);
  assert.equal((await tratarTray(req("PUT", "orders/5", comToken(), "Order[outro]=1"), cfg, b, AGORA)).status, 400);
  assert.equal((await tratarTray(req("PUT", "orders/9", comToken(), "Order[status_id]=31"), cfg, b, AGORA)).status, 404);
  const chave = "35261112345678000199550010000012341000012345";
  const nf = await tratarTray(req("POST", "orders/5/invoices", comToken(), `%5B%22number%22%5D=1234&%5B%22serie%22%5D=1&%5B%22key%22%5D=${chave}`), cfg, b, AGORA);
  assert.equal(nf.status, 201);
  assert.ok(chamadas.includes(`nota:5:1234:${chave}`));
  assert.equal((await tratarTray(req("PUT", "orders/5/invoices/7", comToken(), "number=1235"), cfg, b, AGORA)).status, 200);
  assert.equal((await tratarTray(req("POST", "orders/5/invoices", comToken(), "key=123"), cfg, b, AGORA)).status, 400, "chave curta e sem número é recusada");
  assert.ok(chamadas.includes("status:5:31"));
});

test("pedido no formato da Tray: status, variação e leitura do corpo", () => {
  assert.deepEqual(statusTray({ status: "pago", pdvnet_status: null }), { id: "1", status: "Pago" });
  assert.deepEqual(statusTray({ status: "pago", pdvnet_status: "31" }), { id: "31", status: "Faturado" });
  assert.deepEqual(statusTray({ status: "cancelado", pdvnet_status: null }), { id: "9", status: "Cancelado" });
  const duas: Variacao[] = [{ variacao_id: "1", produto_ref: "T1", cor: "Preto", tamanho: "40", ean: "A" }, { variacao_id: "2", produto_ref: "T1", cor: "Branco", tamanho: "40", ean: "B" }];
  assert.equal(acharVariacao({ produto_ref: "T1", cor: "branco", tamanho: "40" }, duas)?.ean, "B");
  assert.equal(acharVariacao({ produto_ref: "T1", cor: "Azul", tamanho: "40" }, duas), null);
  assert.equal(acharVariacao({ produto_ref: "T1", cor: "Azul", tamanho: "42" }, duas), null);
  assert.equal(campo(achatarCorpo('["Order"]["status_id"]=16'), "status_id"), "16");
  assert.equal(campo(achatarCorpo("Order[status_id]=16"), "status_id"), "16");
  assert.equal(lerNota(achatarCorpo("key=12345&number=9")).chave, null);
});
