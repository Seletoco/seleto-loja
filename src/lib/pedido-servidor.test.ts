import { test } from "node:test";
import assert from "node:assert/strict";
import { limitarCashbackAoSaldo, validarPedido } from "./pedido-servidor";
import type { Produto } from "./tipos";

const tenis: Produto = { ref: "T1", nome: "Tênis X", marca: "nike", categoria: "Tênis", cor: "Preto", tamanhos: ["40", "42"], preco: 300, precoDe: null, foto: null, novo: false };
const achar = (ref: string) => (ref === "T1" ? tenis : undefined);
const base = {
  itens: [{ ref: "T1", tamanho: "40", quantidade: 2 }],
  cliente: { nome: "Maria Souza", telefone: "(21) 99999-0000", email: "" },
  entrega: { tipo: "retirada_loja", loja: "Taquara" },
};

test("recalcula preço e total no servidor, ignorando o que o navegador diz", () => {
  const r = validarPedido({ ...base, itens: [{ ref: "T1", tamanho: "40", quantidade: 2, preco: 1 } as never] }, achar, 20);
  assert.ok("pedido" in r);
  if ("pedido" in r) {
    assert.equal(r.pedido.subtotal, 600);
    assert.equal(r.pedido.total, 600);
    assert.equal(r.pedido.pagamentoMetodo, "pagar_na_loja");
    assert.equal(r.pedido.entrega.lojaId, 3);
  }
});

test("cashback respeita o teto do sistema", () => {
  const r = validarPedido({ ...base, cashback: { usado: 500, telefone: "21999990000" } }, achar, 20);
  assert.ok("pedido" in r);
  if ("pedido" in r) {
    assert.equal(r.pedido.cashbackUsado, 120);
    assert.equal(r.pedido.total, 480);
  }
});

test("o teto de cashback arredonda para baixo (nunca passa de 20%)", () => {
  const caro: Produto = { ...tenis, preco: 149.99 };
  const r = validarPedido({ ...base, itens: [{ ref: "T1", tamanho: "40", quantidade: 2 }], cashback: { usado: 99999, telefone: "21999990000" } }, () => caro, 20);
  assert.ok("pedido" in r);
  if ("pedido" in r) {
    assert.equal(r.pedido.subtotal, 299.98);
    assert.equal(r.pedido.cashbackUsado, 59.99);
    assert.equal(r.pedido.total, 239.99);
  }
});

const CPF = "529.982.247-25"; // CPF válido de teste
const det = { cep: "24000-000", logradouro: "Rua A", numero: "10", complemento: "ap 2", bairro: "Centro", cidade: "Niterói", uf: "rj" };

test("entrega em casa: pagamento combinado, frete validado, CPF e endereço por partes", () => {
  const e = { tipo: "entrega_combinada", endereco: "Rua A, 10 — Centro, Niterói/RJ — CEP 24000000", enderecoDet: det, servico: "PAC", prazoDias: 5 };
  const cli = { ...base.cliente, cpf: CPF };
  const ok = validarPedido({ ...base, cliente: cli, entrega: e, frete: 25.5 }, achar, 20);
  assert.ok("pedido" in ok);
  if ("pedido" in ok) {
    assert.equal(ok.pedido.pagamentoMetodo, "combinar_whatsapp");
    assert.equal(ok.pedido.total, 625.5);
    assert.equal(ok.pedido.cliente.cpf, "52998224725");
    assert.deepEqual(ok.pedido.entrega.enderecoDet, { cep: "24000000", logradouro: "Rua A", numero: "10", complemento: "ap 2", bairro: "Centro", cidade: "Niterói", uf: "RJ" });
  }
  assert.ok("erro" in validarPedido({ ...base, cliente: cli, entrega: e, frete: 99999 }, achar, 20));
  assert.ok("erro" in validarPedido({ ...base, cliente: cli, entrega: e, frete: -5 }, achar, 20));
});

test("entrega exige CPF válido e endereço por partes completo", () => {
  const e = { tipo: "entrega_combinada", endereco: "Rua A, 10 — Centro, Niterói/RJ — CEP 24000000", enderecoDet: det, servico: "PAC", prazoDias: 5 };
  const semCpf = validarPedido({ ...base, entrega: e, frete: 20 }, achar, 20);
  assert.ok("erro" in semCpf && /CPF/.test(semCpf.erro));
  const cpfRuim = validarPedido({ ...base, cliente: { ...base.cliente, cpf: "111.111.111-11" }, entrega: e, frete: 20 }, achar, 20);
  assert.ok("erro" in cpfRuim && /CPF/.test(cpfRuim.erro));
  const semRua = validarPedido({ ...base, cliente: { ...base.cliente, cpf: CPF }, entrega: { ...e, enderecoDet: { ...det, logradouro: "" } }, frete: 20 }, achar, 20);
  assert.ok("erro" in semRua && /endereço/i.test(semRua.erro));
  const semDet = validarPedido({ ...base, cliente: { ...base.cliente, cpf: CPF }, entrega: { ...e, enderecoDet: undefined }, frete: 20 }, achar, 20);
  assert.ok("erro" in semDet);
});

test("retirada: CPF é opcional, mas se vier tem que ser válido", () => {
  const semCpf = validarPedido(base, achar, 20);
  assert.ok("pedido" in semCpf);
  if ("pedido" in semCpf) assert.equal(semCpf.pedido.cliente.cpf, null);
  const comCpf = validarPedido({ ...base, cliente: { ...base.cliente, cpf: CPF } }, achar, 20);
  assert.ok("pedido" in comCpf && comCpf.pedido.cliente.cpf === "52998224725");
  assert.ok("erro" in validarPedido({ ...base, cliente: { ...base.cliente, cpf: "123" } }, achar, 20));
});

test("recusa produto inexistente, tamanho indisponível, quantidade ruim e dados faltando", () => {
  assert.ok("erro" in validarPedido({ ...base, itens: [{ ref: "X", tamanho: "40", quantidade: 1 }] }, achar, 20));
  assert.ok("erro" in validarPedido({ ...base, itens: [{ ref: "T1", tamanho: "99", quantidade: 1 }] }, achar, 20));
  assert.ok("erro" in validarPedido({ ...base, itens: [{ ref: "T1", tamanho: "40", quantidade: 0 }] }, achar, 20));
  assert.ok("erro" in validarPedido({ ...base, itens: [] }, achar, 20));
  assert.ok("erro" in validarPedido({ ...base, cliente: { nome: "A", telefone: "1" } }, achar, 20));
  assert.ok("erro" in validarPedido({ ...base, entrega: { tipo: "retirada_loja", loja: "Inexistente" } }, achar, 20));
});

test("cashback é limitado ao saldo real e o total é recalculado", () => {
  const r = validarPedido({ ...base, cashback: { usado: 100, telefone: "21999990000" } }, achar, 100);
  assert.ok("pedido" in r);
  if ("pedido" in r) {
    assert.equal(r.pedido.cashbackUsado, 100);
    const limitado = limitarCashbackAoSaldo(r.pedido, 29.4);
    assert.equal(limitado.cashbackUsado, 29.4);
    assert.equal(limitado.total, 570.6);
    assert.equal(limitarCashbackAoSaldo(r.pedido, 0).cashbackUsado, 0);
    assert.equal(limitarCashbackAoSaldo(r.pedido, 500).cashbackUsado, 100); // saldo maior que o pedido: nada muda
  }
});
