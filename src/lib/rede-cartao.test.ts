import { test } from "node:test";
import assert from "node:assert/strict";
import { corpoCartao, lerRespostaCartao, luhnOk, parcelasMaximas, validarCartao } from "./rede";

const HOJE = new Date("2026-11-17T12:00:00Z");
const ok = { numero: "5448 2800 0000 0007", nome: "João da Silva", validade: "12/28", cvv: "235", parcelas: 1 };

test("Luhn: aceita cartão de teste e recusa número errado", () => {
  assert.equal(luhnOk("5448280000000007"), true);
  assert.equal(luhnOk("5448280000000008"), false);
  assert.equal(luhnOk("1234"), false);
  assert.equal(luhnOk("abcd280000000007"), false);
});

test("parcelas: só à vista por padrão; respeita máximo e parcela mínima", () => {
  assert.equal(parcelasMaximas(300, {}), 1);
  assert.equal(parcelasMaximas(300, { CARTAO_PARCELAS_MAX: "3" }), 3);
  assert.equal(parcelasMaximas(120, { CARTAO_PARCELAS_MAX: "3" }), 2); // parcela mínima R$ 50
  assert.equal(parcelasMaximas(40, { CARTAO_PARCELAS_MAX: "3" }), 1);
  assert.equal(parcelasMaximas(5000, { CARTAO_PARCELAS_MAX: "99" }), 12);
  assert.equal(parcelasMaximas(300, { CARTAO_PARCELAS_MAX: "3", CARTAO_PARCELA_MINIMA: "100" }), 3);
});

test("validarCartao normaliza nome, validade e número", () => {
  const r = validarCartao(ok, 300, HOJE, {});
  assert.ok(r.ok);
  if (r.ok) {
    assert.equal(r.dados.numero, "5448280000000007");
    assert.equal(r.dados.nome, "JOAO DA SILVA");
    assert.equal(r.dados.mes, 12);
    assert.equal(r.dados.ano, 2028);
    assert.equal(r.dados.cvv, "235");
  }
});

test("validarCartao recusa dados ruins sem repetir o que foi digitado", () => {
  const casos: [Record<string, unknown>, string][] = [
    [{ ...ok, numero: "5448280000000008" }, "número"],
    [{ ...ok, nome: "1" }, "nome"],
    [{ ...ok, validade: "13/28" }, "Mês"],
    [{ ...ok, validade: "10/26" }, "vencido"],
    [{ ...ok, validade: "1228" }, "validade"],
    [{ ...ok, cvv: "12" }, "CVV"],
    [{ ...ok, parcelas: 2 }, "parcelas"],
  ];
  for (const [entrada, trecho] of casos) {
    const r = validarCartao(entrada, 300, HOJE, {});
    assert.equal(r.ok, false, trecho);
    if (!r.ok) {
      assert.match(r.erro, new RegExp(trecho, "i"));
      assert.ok(!r.erro.includes("5448"));
    }
  }
  // o mês corrente ainda vale até o fim do mês
  assert.ok(validarCartao({ ...ok, validade: "11/26" }, 300, HOJE, {}).ok);
});

test("corpoCartao: captura automática, centavos, parcelas só de 2 em diante", () => {
  const v = validarCartao({ ...ok, parcelas: 3 }, 300, HOJE, { CARTAO_PARCELAS_MAX: "3" });
  assert.ok(v.ok);
  if (!v.ok) return;
  const c = corpoCartao("SL1abc", 29999, v.dados, "SELETO STORE!");
  assert.equal(c.capture, true);
  assert.equal(c.kind, "credit");
  assert.equal(c.amount, 29999);
  assert.equal((c as { installments?: number }).installments, 3);
  assert.equal((c as { softDescriptor?: string }).softDescriptor, "SELETO STORE");
  const avista = corpoCartao("SL1abc", 100, { ...v.dados, parcelas: 1 });
  assert.equal("installments" in avista, false);
  assert.equal("softDescriptor" in avista, false);
});

test("lerRespostaCartao: aprovado só com código 00 e tid; resumo sem o número", () => {
  const a = lerRespostaCartao({ returnCode: "00", returnMessage: "Success.", tid: "8345000363484052380", last4: "0007", brand: { name: "Mastercard." } });
  assert.equal(a.aprovado, true);
  assert.equal(a.tid, "8345000363484052380");
  assert.equal(a.resumo, "Mastercard final 0007");
  const n = lerRespostaCartao({ returnCode: "51", returnMessage: "Negada", tid: "123" });
  assert.equal(n.aprovado, false);
  assert.equal(lerRespostaCartao({ returnCode: "00" }).aprovado, false);
  assert.equal(lerRespostaCartao(null).aprovado, false);
});
