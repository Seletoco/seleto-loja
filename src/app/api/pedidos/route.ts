import { NextResponse } from "next/server";
import { bancoLigado } from "@/lib/db";
import { garantirCatalogo, produtoPorRef } from "@/lib/catalogo";
import { limitarCashbackAoSaldo, validarPedido, type PedidoRecebido } from "@/lib/pedido-servidor";
import { regrasCashback } from "@/lib/regras-servidor";
import { excedeuLimiteDePedidos, gravarPedido } from "@/lib/pedido-banco";
import { cashbacksDoCliente, hashCpf, ipDe } from "@/lib/conta-servidor";
import { situacaoDoCashback } from "@/lib/regra-cashback";
import { sessaoAtual } from "@/lib/sessao";
import { EXIGIR_LOGIN } from "@/lib/modo";
import { configDaRede, podeCobrar } from "@/lib/rede";
import { cartaoAtivo, gerarCartao, gerarPix } from "@/lib/pagamentos";
import { conferirFreteDoPedido } from "@/lib/frete-servidor";

const hojeBr = () => new Date(Date.now() - 3 * 3_600_000).toISOString().slice(0, 10);

/**
 * Grava o pedido em loja.pedidos. Sem banco ligado (demonstração) avisa e o checkout guarda só no navegador.
 * O cashback só vale para quem está logado e com a conta ligada ao cadastro; o servidor limita ao saldo real.
 */
export async function POST(req: Request) {
  if (!bancoLigado()) return NextResponse.json({ demo: true });
  let corpo: PedidoRecebido;
  try {
    corpo = await req.json();
  } catch {
    return NextResponse.json({ erro: "Pedido inválido." }, { status: 400 });
  }
  const s = await sessaoAtual();
  if (EXIGIR_LOGIN && !s) return NextResponse.json({ erro: "Entre ou crie sua conta para fazer o pedido.", precisaLogin: true }, { status: 401 });

  await garantirCatalogo();
  const regras = await regrasCashback();
  const v = validarPedido(corpo, produtoPorRef, regras.tetoUsoPct);
  if ("erro" in v) return NextResponse.json({ erro: v.erro }, { status: 400 });
  // Frete conferido no servidor: cota de novo e recusa qualquer valor diferente do cotado (o navegador não decide o frete).
  const fr = await conferirFreteDoPedido(v.pedido);
  if ("erro" in fr) return NextResponse.json({ erro: fr.erro }, { status: 400 });
  let p = fr.pedido;
  // Conta ligada ao cadastro: o CPF informado tem que ser o da própria conta (ninguém faz pedido no CPF de outra pessoa).
  if (p.cliente.cpf && s?.cpfHash && hashCpf(p.cliente.cpf) !== s.cpfHash) return NextResponse.json({ erro: "O CPF informado não é o da sua conta. Confira o número." }, { status: 400 });
  // Pix na hora: o cliente paga já no checkout (a cobrança sai do total que o servidor calculou).
  const formaOnline = (corpo as { pagamento?: unknown }).pagamento;
  const querPix = formaOnline === "pix";
  const querCartao = formaOnline === "cartao";
  if (querPix && !podeCobrar(configDaRede())) return NextResponse.json({ erro: "O pagamento por Pix não está disponível agora. Escolha outra forma." }, { status: 400 });
  if (querCartao && !(cartaoAtivo() && podeCobrar(configDaRede()))) return NextResponse.json({ erro: "O pagamento por cartão não está disponível agora. Escolha outra forma." }, { status: 400 });

  if (p.cashbackUsado > 0) {
    if (!s?.cpfHash) return NextResponse.json({ erro: "Para usar o cashback, entre na sua conta e ligue ao seu cadastro da Seleto.", precisaLogin: true }, { status: 401 });
    const situacao = situacaoDoCashback(await cashbacksDoCliente(s.cpfHash), p.subtotal, hojeBr(), {
      compraMinima: regras.compraMinima,
      tetoPercentualDaCompra: regras.tetoUsoPct,
      exemplo: regras.exemplo,
    });
    p = limitarCashbackAoSaldo(p, situacao.utilizavel);
    p = { ...p, cashbackTelefone: p.cashbackUsado > 0 ? p.cliente.telefone : null };
  }

  if (await excedeuLimiteDePedidos(ipDe(req))) return NextResponse.json({ erro: "Muitos pedidos em pouco tempo. Tente novamente mais tarde." }, { status: 429 });
  try {
    const numero = await gravarPedido(p, s?.contaId ?? null);
    let pagarUrl: string | null = null;
    let avisoPix: string | null = null;
    if (querPix || querCartao) {
      // O pedido já está gravado; se a cobrança falhar, ele continua valendo e a loja combina o pagamento.
      const r = await (querCartao ? gerarCartao(numero) : gerarPix(numero)).catch((e) => ({ ok: false as const, erro: `exceção: ${e instanceof Error ? e.message : "erro"}` }));
      if (r.ok) pagarUrl = `/pagar/${r.cobranca.token}`;
      else console.error(`[pagamento] pedido ${numero}: não gerou ${querCartao ? "cartão" : "Pix"}:`, r.erro.slice(0, 300)); // motivo nos logs (sem dados pessoais)
      if (!r.ok) avisoPix = `Seu pedido foi registrado, mas não conseguimos preparar o pagamento por ${querCartao ? "cartão" : "Pix"} agora. A loja vai chamar você no WhatsApp para combinar o pagamento.`;
    }
    return NextResponse.json({ numero, subtotal: p.subtotal, frete: p.frete, cashbackUsado: p.cashbackUsado, total: p.total, pagamento: pagarUrl ? (querCartao ? "cartao" : "pix") : p.pagamentoMetodo, pagarUrl, avisoPix });
  } catch (e) {
    console.error("pedido: falha ao gravar", e instanceof Error ? e.message : e);
    return NextResponse.json({ erro: "Não foi possível registrar o pedido agora. Tente novamente ou chame a loja no WhatsApp." }, { status: 500 });
  }
}
