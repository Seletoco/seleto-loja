/** Gravação do pedido em loja.pedidos (compartilhada pelo checkout e pela compra de 1 clique) e freio por rede. */
import { db } from "./db";
import { falhasRecentes, hashCurto, registrarTentativa } from "./contas-servidor";
import type { PedidoValidado } from "./pedido-servidor";

const MAX_PEDIDOS_POR_HORA = 10; // por rede

/** true = a rede passou do limite de pedidos por hora. Se não passou, já registra este pedido. */
export async function excedeuLimiteDePedidos(ip: string): Promise<boolean> {
  const chave = `pedido:${hashCurto(ip)}`;
  if ((await falhasRecentes(chave, 60)) >= MAX_PEDIDOS_POR_HORA) return true;
  await registrarTentativa(chave, ip, false);
  return false;
}

export async function gravarPedido(p: PedidoValidado, contaId: string | null): Promise<number> {
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
        contaId,
      ],
    );
    for (const i of p.itens) {
      await cliente.query(
        `INSERT INTO loja.pedido_itens (pedido_id, produto_ref, nome, cor, tamanho, quantidade, preco_unit) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [rows[0].id, i.ref, i.nome, i.cor, i.tamanho, i.quantidade, i.preco],
      );
    }
    await cliente.query("COMMIT");
    return Number(rows[0].numero);
  } catch (e) {
    await cliente.query("ROLLBACK").catch(() => {});
    throw e;
  } finally {
    cliente.release();
  }
}
