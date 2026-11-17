import { test } from "node:test";
import assert from "node:assert/strict";
import { assinarCotacao, lerCotacao, resumoDosItens, type DadosCotacao } from "./frete-assinatura";
import { aplicarFreteAssinado } from "./frete-conferencia";
import type { PedidoValidado } from "./pedido-servidor";

const SEGREDO = "segredo-de-teste-bem-longo-123";
const AGORA = Date.parse("2026-11-17T20:00:00Z");
const itensPedido = [{ ref: "T1", nome: "Tênis", cor: "Preto", tamanho: "40", quantidade: 1, preco: 100 }];
const dados = (extra: Partial<DadosCotacao> = {}): DadosCotacao => ({ cep: "24000000", itens: resumoDosItens(itensPedido), nome: "Loggi Express", valor: 13.44, prazoDias: 2, exemplo: false, exp: AGORA + 3_600_000, ...extra });
const pedido = (frete = 13.44, servico: string | null = "Loggi Express", cep = "24000000", cashback = 0): PedidoValidado => ({
  itens: itensPedido,
  cliente: { nome: "Maria", telefone: "21999990000", email: null, cpf: "52998224725" },
  entrega: { tipo: "entrega_combinada", lojaId: null, endereco: "Rua A, 10", enderecoDet: { cep, logradouro: "Rua A", numero: "10", complemento: "", bairro: "Centro", cidade: "Niterói", uf: "RJ" }, servico, prazoDias: 99, freteEstimado: true },
  pagamentoMetodo: "combinar_whatsapp",
  subtotal: 100,
  frete,
  cashbackUsado: cashback,
  cashbackTelefone: null,
  total: 100 + frete - cashback,
});

test("assinatura: só vale a que o servidor assinou, e expira", () => {
  const t = assinarCotacao(SEGREDO, dados());
  assert.deepEqual(lerCotacao(SEGREDO, t, AGORA), dados());
  assert.equal(lerCotacao("outro-segredo-qualquer-123456", t, AGORA), null, "segredo diferente");
  assert.equal(lerCotacao(SEGREDO, t, AGORA + 4_000_000), null, "expirada");
  const [corpo, sig] = t.split(".");
  const adulterado = Buffer.from(JSON.stringify({ ...dados(), valor: 0 }), "utf8").toString("base64url");
  assert.equal(lerCotacao(SEGREDO, `${adulterado}.${sig}`, AGORA), null, "valor mexido com a assinatura antiga");
  assert.equal(lerCotacao(SEGREDO, `${corpo}.${sig}x`, AGORA), null);
  for (const lixo of [undefined, null, 5, "", "abc", "a.b.c", "x".repeat(3000)]) assert.equal(lerCotacao(SEGREDO, lixo, AGORA), null);
});

test("resumo dos itens: soma por produto, ordena e limita cada linha a 20", () => {
  assert.equal(resumoDosItens([{ ref: "B", quantidade: 1 }, { ref: "A", quantidade: 2 }, { ref: "B", quantidade: 3 }]), "A:2|B:4");
  assert.equal(resumoDosItens([{ ref: "A", quantidade: 99 }]), "A:20");
  assert.equal(resumoDosItens([{ ref: "A" }]), "A:1");
});

test("pedido com o frete assinado: segue, com valor/prazo/estimativa do servidor e total recalculado", () => {
  const r = aplicarFreteAssinado(pedido(13.44, "Loggi Express", "24000000", 10), dados());
  assert.ok("pedido" in r);
  if ("pedido" in r) {
    assert.equal(r.pedido.frete, 13.44);
    assert.equal(r.pedido.total, 103.44);
    assert.equal(r.pedido.entrega.prazoDias, 2);
    assert.equal(r.pedido.entrega.freteEstimado, false);
  }
  assert.ok("pedido" in aplicarFreteAssinado(pedido(13.445), dados()), "tolera 1 centavo");
  assert.ok("pedido" in aplicarFreteAssinado(pedido(13.44, "  loggi express "), dados()), "ignora caixa e espaços");
});

test("recusa: sem assinatura, valor mexido, outro serviço, outro CEP ou outros itens", () => {
  assert.ok("erro" in aplicarFreteAssinado(pedido(), null));
  assert.ok("erro" in aplicarFreteAssinado(pedido(0), dados()), "frete zerado");
  assert.ok("erro" in aplicarFreteAssinado(pedido(99), dados()), "frete maior");
  assert.ok("erro" in aplicarFreteAssinado(pedido(13.44, "Correios SEDEX"), dados()), "outro serviço");
  assert.ok("erro" in aplicarFreteAssinado(pedido(13.44, null), dados()), "sem serviço");
  assert.ok("erro" in aplicarFreteAssinado(pedido(13.44, "Loggi Express", "22710255"), dados()), "assinatura de outro CEP");
  assert.ok("erro" in aplicarFreteAssinado(pedido(), dados({ itens: "T1:5" })), "cotado para outros itens");
  const r = aplicarFreteAssinado(pedido(), null);
  assert.ok("erro" in r && /Calcule o frete de novo/.test(r.erro));
});
