import { test } from "node:test";
import assert from "node:assert/strict";
import { aplicarFreteCotado } from "./frete-conferencia";
import { embalagemDoPedido, estimativaDeExemplo, type OpcaoFrete } from "./frete";
import type { PedidoValidado } from "./pedido-servidor";

const opcoes: OpcaoFrete[] = [
  { servico: "ME1", nome: "Correios PAC", valor: 21.5, prazoDias: 6, exemplo: false },
  { servico: "ME2", nome: "Correios SEDEX", valor: 42.1, prazoDias: 2, exemplo: false },
];
const pedido = (frete: number, servico: string | null = "Correios PAC", cashback = 0): PedidoValidado => ({
  itens: [{ ref: "T1", nome: "Tênis", cor: "Preto", tamanho: "40", quantidade: 1, preco: 100 }],
  cliente: { nome: "Maria", telefone: "21999990000", email: null, cpf: "52998224725" },
  entrega: { tipo: "entrega_combinada", lojaId: null, endereco: "Rua A, 10", enderecoDet: { cep: "24000000", logradouro: "Rua A", numero: "10", complemento: "", bairro: "Centro", cidade: "Niterói", uf: "RJ" }, servico, prazoDias: 99, freteEstimado: true },
  pagamentoMetodo: "combinar_whatsapp",
  subtotal: 100,
  frete,
  cashbackUsado: cashback,
  cashbackTelefone: null,
  total: 100 + frete - cashback,
});

test("frete igual ao cotado pelo servidor: segue, com prazo e estimativa do servidor", () => {
  const r = aplicarFreteCotado(pedido(21.5), opcoes);
  assert.ok("pedido" in r);
  if ("pedido" in r) {
    assert.equal(r.pedido.frete, 21.5);
    assert.equal(r.pedido.total, 121.5);
    assert.equal(r.pedido.entrega.prazoDias, 6);
    assert.equal(r.pedido.entrega.freteEstimado, false);
  }
  assert.ok("pedido" in aplicarFreteCotado(pedido(21.505), opcoes), "tolera 1 centavo");
});

test("frete adulterado (menor ou maior) é recusado, e a mensagem mostra o valor certo", () => {
  for (const f of [0, 5, 21.4, 21.52, 99]) {
    const r = aplicarFreteCotado(pedido(f), opcoes);
    assert.ok("erro" in r, `frete ${f}`);
    if ("erro" in r) assert.match(r.erro, /21,50/);
  }
});

test("serviço que o servidor não cotou é recusado (não aceita nome inventado nem frete de outro serviço)", () => {
  assert.ok("erro" in aplicarFreteCotado(pedido(21.5, "Frete grátis"), opcoes));
  assert.ok("erro" in aplicarFreteCotado(pedido(21.5, null), opcoes));
  assert.ok("erro" in aplicarFreteCotado(pedido(21.5, "Correios SEDEX"), opcoes), "SEDEX com preço do PAC");
  assert.ok("pedido" in aplicarFreteCotado(pedido(42.1, "  correios sedex "), opcoes), "ignora caixa e espaços");
});

test("o total considera o cashback usado", () => {
  const r = aplicarFreteCotado(pedido(21.5, "Correios PAC", 10), opcoes);
  assert.ok("pedido" in r);
  if ("pedido" in r) assert.equal(r.pedido.total, 111.5);
});

test("modo estimativa: a mesma estimativa do servidor bate com a que o cliente viu", () => {
  const emb = embalagemDoPedido([{ categoria: "Tênis", quantidade: 1 }]);
  const est = estimativaDeExemplo("RJ", emb, "RJ");
  const pac = est.find((o) => o.servico === "PAC")!;
  const r = aplicarFreteCotado(pedido(pac.valor, pac.nome), est);
  assert.ok("pedido" in r);
  if ("pedido" in r) assert.equal(r.pedido.entrega.freteEstimado, true);
});
