/** Leitura e mudança de status dos pedidos gravados em loja.pedidos (só o painel admin usa). */
import { db } from "./db";
import { LOJAS } from "./lojas";
import { FORMAS_PAGAMENTO } from "./pagamento";
import type { PedidoSalvo } from "./tipos";

export const STATUS_PEDIDO = ["aguardando_pagamento", "pago", "em_separacao", "pronto_retirada", "enviado", "entregue", "cancelado"] as const;

interface Linha {
  id: string;
  numero: string;
  criado_em: Date;
  status: string;
  cliente_nome: string;
  cliente_telefone: string;
  cliente_email: string | null;
  entrega_tipo: "retirada_loja" | "entrega_combinada";
  loja_retirada_id: number | null;
  endereco: { texto?: string } | null;
  pagamento_metodo: string;
  subtotal: string;
  frete: string;
  total: string;
  cashback_usado: string;
  cashback_telefone: string | null;
  entrega_servico: string | null;
  entrega_prazo_dias: number | null;
  frete_estimado: boolean;
}

export async function listarPedidos(limite = 200): Promise<PedidoSalvo[]> {
  const banco = db();
  const { rows } = await banco.query<Linha>(`SELECT id::text, numero::text, criado_em, status, cliente_nome, cliente_telefone, cliente_email, entrega_tipo, loja_retirada_id, endereco, pagamento_metodo, subtotal::text, frete::text, total::text, cashback_usado::text, cashback_telefone, entrega_servico, entrega_prazo_dias, frete_estimado FROM loja.pedidos ORDER BY criado_em DESC LIMIT $1`, [limite]);
  if (rows.length === 0) return [];
  const { rows: itens } = await banco.query<{ pedido_id: string; produto_ref: string; nome: string; cor: string | null; tamanho: string | null; quantidade: number; preco_unit: string }>(
    `SELECT pedido_id::text, produto_ref, nome, cor, tamanho, quantidade, preco_unit::text FROM loja.pedido_itens WHERE pedido_id = ANY($1::uuid[])`,
    [rows.map((r) => r.id)],
  );
  return rows.map((r) => ({
    numero: Number(r.numero),
    criadoEm: r.criado_em.toISOString(),
    status: r.status,
    cliente: { nome: r.cliente_nome, telefone: r.cliente_telefone, email: r.cliente_email ?? "" },
    entrega: {
      tipo: r.entrega_tipo,
      loja: LOJAS.find((l) => l.id === r.loja_retirada_id)?.nome,
      endereco: r.endereco?.texto,
      servico: r.entrega_servico ?? undefined,
      prazoDias: r.entrega_prazo_dias ?? undefined,
      freteExemplo: r.frete_estimado,
    },
    pagamento: { metodo: r.pagamento_metodo, rotulo: FORMAS_PAGAMENTO.find((f) => f.id === r.pagamento_metodo)?.rotulo ?? r.pagamento_metodo },
    subtotal: Number(r.subtotal),
    frete: Number(r.frete),
    total: Number(r.total),
    cashback: Number(r.cashback_usado) > 0 ? { usado: Number(r.cashback_usado), telefone: r.cashback_telefone ?? "" } : undefined,
    itens: itens
      .filter((i) => i.pedido_id === r.id)
      .map((i) => ({ ref: i.produto_ref, nome: i.nome, cor: i.cor ?? "", tamanho: i.tamanho ?? "", preco: Number(i.preco_unit), foto: null, quantidade: i.quantidade })),
  }));
}

export async function mudarStatus(numero: number, status: string): Promise<boolean> {
  if (!(STATUS_PEDIDO as readonly string[]).includes(status)) return false;
  const { rowCount } = await db().query(`UPDATE loja.pedidos SET status = $1, atualizado_em = now() WHERE numero = $2`, [status, numero]);
  return (rowCount ?? 0) > 0;
}
