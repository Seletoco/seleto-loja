/**
 * Pedidos do site no PDVNet (nota fiscal). O admin LIBERA cada pedido; só os liberados aparecem para o PDVNet baixar.
 * Colunas novas de loja.pedidos (migration 015). Sem a migration, leitura devolve vazio e a liberação avisa.
 */
import { db } from "./db";

export interface SituacaoPdvnet {
  liberadoEm: string | null;
  baixadoEm: string | null;
  status: string | null;
  venda: string | null;
  notaChave: string | null;
  notaNumero: string | null;
}

/** Pode liberar? Pedido pago (não aguardando, não cancelado, não estornado) e, se for entrega, com CPF. */
export function podeLiberar(p: { status: string; pagamento_status: string; entrega_tipo: string; cliente_cpf: string | null; liberado: boolean }): string | null {
  if (p.liberado) return null;
  if (p.status === "cancelado" || p.pagamento_status === "estornado") return "Pedido cancelado ou estornado.";
  if (p.status === "aguardando_pagamento") return "O pedido ainda não foi pago. Libere depois que o pagamento for confirmado.";
  if (p.entrega_tipo === "entrega_combinada" && !p.cliente_cpf) return "Pedido de entrega sem CPF: a nota fiscal não sai. Peça o CPF ao cliente.";
  return null;
}

export async function pdvnetDosPedidos(numeros: number[]): Promise<Record<number, SituacaoPdvnet>> {
  if (!numeros.length) return {};
  try {
    const { rows } = await db().query<{ numero: string; liberado: Date | null; baixado: Date | null; status: string | null; venda: string | null; chave: string | null; nnota: string | null }>(
      `SELECT numero::text, pdvnet_liberado_em AS liberado, pdvnet_baixado_em AS baixado, pdvnet_status AS status, pdvnet_venda AS venda, nota_chave AS chave, nota_numero AS nnota
         FROM loja.pedidos WHERE numero = ANY($1::bigint[]) AND (pdvnet_liberado_em IS NOT NULL OR pdvnet_status IS NOT NULL)`,
      [numeros],
    );
    return Object.fromEntries(
      rows.map((r) => [Number(r.numero), { liberadoEm: r.liberado?.toISOString() ?? null, baixadoEm: r.baixado?.toISOString() ?? null, status: r.status, venda: r.venda, notaChave: r.chave, notaNumero: r.nnota }]),
    );
  } catch {
    return {};
  }
}

/** Liberação automática ligada? PDVNET_AUTO_LIBERAR=1. */
export const liberacaoAutomatica = (env: Record<string, string | undefined> = process.env) => env.PDVNET_AUTO_LIBERAR === "1";

/** Atraso (min) entre o pagamento e o PDVNet poder baixar o pedido: dá tempo de cancelar/devolver. PDVNET_AUTO_ATRASO_MIN, 0 a 1440, padrão 10. */
export function atrasoDaLiberacao(env: Record<string, string | undefined> = process.env): number {
  const n = Number(env.PDVNET_AUTO_ATRASO_MIN);
  return env.PDVNET_AUTO_ATRASO_MIN !== undefined && env.PDVNET_AUTO_ATRASO_MIN !== "" && Number.isFinite(n) && n >= 0 && n <= 1440 ? Math.round(n) : 10;
}

/**
 * Chamada assim que um pagamento online é confirmado. Se a liberação automática está ligada, libera o pedido para o PDVNet
 * (daqui a `atrasoDaLiberacao` minutos). Só libera pedido pago, não cancelado e, na entrega, com CPF; nunca mexe em pedido já liberado.
 * Falha em silêncio (a liberação manual no admin continua valendo): nunca atrapalha o pagamento.
 */
export async function liberarAutomaticamente(pedidoId: string): Promise<boolean> {
  if (!liberacaoAutomatica()) return false;
  try {
    const { rowCount } = await db().query(
      `UPDATE loja.pedidos SET pdvnet_liberado_em = now() + make_interval(mins => $2), atualizado_em = now()
        WHERE id = $1::uuid AND pdvnet_liberado_em IS NULL AND status <> 'cancelado' AND status <> 'aguardando_pagamento'
          AND pagamento_status = 'confirmado' AND (entrega_tipo = 'retirada_loja' OR cliente_cpf IS NOT NULL)`,
      [pedidoId, atrasoDaLiberacao()],
    );
    return (rowCount ?? 0) > 0;
  } catch (e) {
    console.error("[pdvnet] liberação automática falhou:", e instanceof Error ? e.message.slice(0, 120) : "erro");
    return false;
  }
}

export type ResultadoLiberacao = { ok: true; liberadoEm: string | null } | { ok: false; erro: string };

/** Libera (ou tira a liberação, se o PDVNet ainda não baixou) um pedido. */
export async function liberarParaPdvnet(numero: number, liberar: boolean): Promise<ResultadoLiberacao> {
  const banco = db();
  const { rows } = await banco.query<{ status: string; pagamento_status: string; entrega_tipo: string; cliente_cpf: string | null; liberado: Date | null; baixado: Date | null }>(
    `SELECT status, pagamento_status, entrega_tipo, cliente_cpf, pdvnet_liberado_em AS liberado, pdvnet_baixado_em AS baixado FROM loja.pedidos WHERE numero = $1`,
    [numero],
  );
  const p = rows[0];
  if (!p) return { ok: false, erro: "Pedido não encontrado." };
  if (liberar) {
    const erro = podeLiberar({ ...p, liberado: Boolean(p.liberado) });
    if (erro) return { ok: false, erro };
    await banco.query(`UPDATE loja.pedidos SET pdvnet_liberado_em = COALESCE(pdvnet_liberado_em, now()), atualizado_em = now() WHERE numero = $1`, [numero]);
    return { ok: true, liberadoEm: (p.liberado ?? new Date()).toISOString() };
  }
  if (p.baixado) return { ok: false, erro: "O PDVNet já baixou este pedido; não dá mais para tirar a liberação." };
  await banco.query(`UPDATE loja.pedidos SET pdvnet_liberado_em = NULL, atualizado_em = now() WHERE numero = $1`, [numero]);
  return { ok: true, liberadoEm: null };
}
