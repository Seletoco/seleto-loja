/** Resumo do pedido para a página de pagamento (só dados do próprio pedido: itens, entrega, valores). O CPF nunca entra aqui. */
import { db } from "./db";
import { LOJAS } from "./lojas";

export interface ResumoPedido {
  numero: number;
  itens: { nome: string; cor: string; tamanho: string; quantidade: number; preco: number }[];
  subtotal: number;
  frete: number;
  cashback: number;
  total: number;
  retirada: boolean;
  loja: string | null;
  endereco: string | null;
  servico: string | null;
  prazoDias: number | null;
}

export async function resumoDoPedido(numero: number): Promise<ResumoPedido | null> {
  const banco = db();
  const { rows } = await banco.query<{
    id: string; numero: string; entrega_tipo: string; loja_retirada_id: number | null; endereco: { texto?: string } | null;
    subtotal: string; frete: string; total: string; cashback_usado: string; entrega_servico: string | null; entrega_prazo_dias: number | null;
  }>(
    `SELECT id::text, numero::text, entrega_tipo, loja_retirada_id, endereco, subtotal::text, frete::text, total::text, cashback_usado::text, entrega_servico, entrega_prazo_dias
       FROM loja.pedidos WHERE numero = $1`,
    [numero],
  );
  const r = rows[0];
  if (!r) return null;
  const { rows: itens } = await banco.query<{ nome: string; cor: string | null; tamanho: string | null; quantidade: number; preco_unit: string }>(
    `SELECT nome, cor, tamanho, quantidade, preco_unit::text FROM loja.pedido_itens WHERE pedido_id = $1::uuid ORDER BY id`,
    [r.id],
  );
  return {
    numero: Number(r.numero),
    itens: itens.map((i) => ({ nome: i.nome, cor: i.cor ?? "", tamanho: i.tamanho ?? "", quantidade: i.quantidade, preco: Number(i.preco_unit) })),
    subtotal: Number(r.subtotal),
    frete: Number(r.frete),
    cashback: Number(r.cashback_usado),
    total: Number(r.total),
    retirada: r.entrega_tipo === "retirada_loja",
    loja: LOJAS.find((l) => l.id === r.loja_retirada_id)?.nome ?? null,
    endereco: r.endereco?.texto ?? null,
    servico: r.entrega_servico,
    prazoDias: r.entrega_prazo_dias,
  };
}
