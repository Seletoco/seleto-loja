import { NextResponse } from "next/server";
import { bancoLigado, db } from "@/lib/db";
import { produtoPorRef } from "@/lib/catalogo";
import { validarPedido, type PedidoRecebido } from "@/lib/pedido-servidor";
import { regrasCashback } from "@/lib/regras-servidor";
import { falhasRecentes, hashCurto, registrarTentativa } from "@/lib/contas-servidor";
import { ipDe } from "@/lib/conta-servidor";
import { sessaoAtual } from "@/lib/sessao";

const MAX_PEDIDOS_POR_HORA = 10; // por rede

/** Grava o pedido em loja.pedidos. Sem banco ligado (demonstração) avisa e o checkout guarda só no navegador, como antes. */
export async function POST(req: Request) {
  if (!bancoLigado()) return NextResponse.json({ demo: true });
  let corpo: PedidoRecebido;
  try {
    corpo = await req.json();
  } catch {
    return NextResponse.json({ erro: "Pedido inválido." }, { status: 400 });
  }
  const regras = await regrasCashback();
  const v = validarPedido(corpo, produtoPorRef, regras.tetoUsoPct);
  if ("erro" in v) return NextResponse.json({ erro: v.erro }, { status: 400 });
  const p = v.pedido;

  const ip = ipDe(req);
  const chave = `pedido:${hashCurto(ip)}`;
  if ((await falhasRecentes(chave, 60)) >= MAX_PEDIDOS_POR_HORA) return NextResponse.json({ erro: "Muitos pedidos em pouco tempo. Tente novamente mais tarde." }, { status: 429 });
  await registrarTentativa(chave, ip, false);

  const s = await sessaoAtual();
  const cliente = await db().connect();
  try {
    await cliente.query("BEGIN");
    const { rows } = await cliente.query<{ id: string; numero: string }>(
      `INSERT INTO loja.pedidos
         (status, cliente_nome, cliente_telefone, cliente_email, entrega_tipo, loja_retirada_id, endereco, pagamento_metodo,
          subtotal, desconto, frete, total, cashback_usado, cashback_telefone, entrega_servico, entrega_prazo_dias, frete_estimado, conta_id)
       VALUES ('aguardando_pagamento', $1, $2, $3, $4, $5, $6, $7, $8, 0, $9, $10, $11, $12, $13, $14, $15, $16)
       RETURNING id::text, numero::text`,
      [
        p.cliente.nome, p.cliente.telefone, p.cliente.email, p.entrega.tipo, p.entrega.lojaId,
        p.entrega.endereco ? JSON.stringify({ texto: p.entrega.endereco }) : null, p.pagamentoMetodo,
        p.subtotal, p.frete, p.total, p.cashbackUsado, p.cashbackTelefone, p.entrega.servico, p.entrega.prazoDias, p.entrega.freteEstimado,
        s?.contaId ?? null,
      ],
    );
    for (const i of p.itens) {
      await cliente.query(
        `INSERT INTO loja.pedido_itens (pedido_id, produto_ref, nome, cor, tamanho, quantidade, preco_unit) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [rows[0].id, i.ref, i.nome, i.cor, i.tamanho, i.quantidade, i.preco],
      );
    }
    await cliente.query("COMMIT");
    return NextResponse.json({ numero: Number(rows[0].numero), subtotal: p.subtotal, frete: p.frete, cashbackUsado: p.cashbackUsado, total: p.total, pagamento: p.pagamentoMetodo });
  } catch (e) {
    await cliente.query("ROLLBACK").catch(() => {});
    console.error("pedido: falha ao gravar", e instanceof Error ? e.message : e);
    return NextResponse.json({ erro: "Não foi possível registrar o pedido agora. Tente novamente ou chame a loja no WhatsApp." }, { status: 500 });
  } finally {
    cliente.release();
  }
}
