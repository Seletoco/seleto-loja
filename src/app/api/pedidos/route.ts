import { NextResponse } from "next/server";
import { bancoLigado } from "@/lib/db";
import { garantirCatalogo, produtoPorRef } from "@/lib/catalogo";
import { limitarCashbackAoSaldo, validarPedido, type PedidoRecebido } from "@/lib/pedido-servidor";
import { regrasCashback } from "@/lib/regras-servidor";
import { excedeuLimiteDePedidos, gravarPedido } from "@/lib/pedido-banco";
import { cashbacksDoCliente, ipDe } from "@/lib/conta-servidor";
import { situacaoDoCashback } from "@/lib/regra-cashback";
import { sessaoAtual } from "@/lib/sessao";
import { EXIGIR_LOGIN } from "@/lib/modo";

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
  let p = v.pedido;

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
    return NextResponse.json({ numero, subtotal: p.subtotal, frete: p.frete, cashbackUsado: p.cashbackUsado, total: p.total, pagamento: p.pagamentoMetodo });
  } catch (e) {
    console.error("pedido: falha ao gravar", e instanceof Error ? e.message : e);
    return NextResponse.json({ erro: "Não foi possível registrar o pedido agora. Tente novamente ou chame a loja no WhatsApp." }, { status: 500 });
  }
}
