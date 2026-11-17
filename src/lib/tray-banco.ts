/** Acesso ao banco da API Tray (pedidos liberados ao PDVNet). Colunas da migration 015. */
import { db } from "./db";
import type { DadosNota } from "./tray-pedidos";
import type { LinhaItem, LinhaPedido, Variacao } from "./tray-pedidos";

export interface BancoTray {
  liberados(): Promise<LinhaPedido[]>;
  liberado(numero: number): Promise<LinhaPedido | null>;
  itens(numero: number): Promise<LinhaItem[]>;
  variacoes(refs: string[]): Promise<Variacao[]>;
  marcarBaixado(numero: number): Promise<void>;
  gravarStatus(numero: number, statusId: string): Promise<boolean>;
  gravarNota(numero: number, nota: DadosNota): Promise<boolean>;
}

const COLUNAS = `p.numero::text, p.criado_em, p.atualizado_em, p.status, p.cliente_nome, p.cliente_telefone, p.cliente_email, p.cliente_cpf, p.entrega_tipo, p.loja_retirada_id,
  p.endereco, p.pagamento_metodo, p.subtotal::text, p.frete::text, p.total::text, p.cashback_usado::text, p.entrega_servico, p.pdvnet_status, p.nota_chave, p.nota_numero,
  (SELECT max(g.pago_em) FROM loja.pagamentos g WHERE g.pedido_id = p.id AND g.status = 'pago') AS pago_em`;

export const bancoTray: BancoTray = {
  async liberados() {
    const { rows } = await db().query<LinhaPedido>(`SELECT ${COLUNAS} FROM loja.pedidos p WHERE p.pdvnet_liberado_em IS NOT NULL ORDER BY p.numero DESC LIMIT 500`);
    return rows;
  },
  async liberado(numero) {
    const { rows } = await db().query<LinhaPedido>(`SELECT ${COLUNAS} FROM loja.pedidos p WHERE p.numero = $1 AND p.pdvnet_liberado_em IS NOT NULL`, [numero]);
    return rows[0] ?? null;
  },
  async itens(numero) {
    const { rows } = await db().query<LinhaItem>(
      `SELECT i.produto_ref, i.nome, i.cor, i.tamanho, i.quantidade, i.preco_unit::text FROM loja.pedido_itens i JOIN loja.pedidos p ON p.id = i.pedido_id WHERE p.numero = $1 ORDER BY i.id`,
      [numero],
    );
    return rows;
  },
  async variacoes(refs) {
    if (!refs.length) return [];
    const { rows } = await db().query<Variacao>(`SELECT variacao_id::text, produto_ref, cor, tamanho, ean FROM loja.v_variacoes WHERE produto_ref = ANY($1::text[])`, [refs]);
    return rows;
  },
  async marcarBaixado(numero) {
    await db().query(`UPDATE loja.pedidos SET pdvnet_baixado_em = COALESCE(pdvnet_baixado_em, now()) WHERE numero = $1 AND pdvnet_liberado_em IS NOT NULL`, [numero]);
  },
  async gravarStatus(numero, statusId) {
    const { rowCount } = await db().query(`UPDATE loja.pedidos SET pdvnet_status = $2, atualizado_em = now() WHERE numero = $1 AND pdvnet_liberado_em IS NOT NULL`, [numero, statusId.slice(0, 10)]);
    return (rowCount ?? 0) > 0;
  },
  async gravarNota(numero, nota) {
    const { rowCount } = await db().query(
      `UPDATE loja.pedidos SET nota_numero = COALESCE($2, nota_numero), nota_chave = COALESCE($3, nota_chave), atualizado_em = now() WHERE numero = $1 AND pdvnet_liberado_em IS NOT NULL`,
      [numero, nota.numero, nota.chave],
    );
    return (rowCount ?? 0) > 0;
  },
};
