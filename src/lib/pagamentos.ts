/**
 * Cobranças do site (hoje: Pix pela Rede). Tudo no servidor: o valor sai do pedido gravado no banco, nunca do navegador.
 * Tabelas: loja.pagamentos e loja.pagamentos_eventos (migration 013). Sem a migration aplicada, as funções avisam e não quebram o resto.
 */
import { randomBytes } from "node:crypto";
import { db } from "./db";
import { cobrarCartaoNaRede, configDaRede, consultarPixNaRede, criarPixNaRede, devolverPixNaRede, parcelasMaximas, podeCobrar, referenciaDoPedido, validarCartao, type EntradaCartao, type StatusPagamento } from "./rede";

/** Quanto tempo o QR Code Pix vale (minutos). Padrão 2 h; pode mudar com REDE_PIX_MINUTOS (15 a 1440). */
export function minutosDoPix(env: Record<string, string | undefined> = process.env): number {
  const n = Number(env.REDE_PIX_MINUTOS);
  return Number.isFinite(n) && n >= 15 && n <= 1440 ? Math.round(n) : 120;
}

/** Só reconsulta a Rede se a última conferência tem mais de 15 s (evita martelar a API quando a página atualiza). */
export const precisaConferir = (conferidoEm: Date | null, agoraMs: number) => !conferidoEm || agoraMs - conferidoEm.getTime() > 15_000;

export interface Cobranca {
  token: string;
  metodo: "pix" | "cartao";
  /** Parcelas sem juros oferecidas (só cartão). */
  parcelasMax: number;
  pedidoNumero: number;
  valor: number;
  status: StatusPagamento;
  emv: string | null;
  expiraEm: string | null;
  ambiente: "sandbox" | "producao";
  pagoEm: string | null;
}

interface Linha {
  id: string;
  metodo: "pix" | "cartao";
  pedido_id: string;
  numero: string;
  token: string;
  tid: string | null;
  valor: string;
  status: StatusPagamento;
  qr_emv: string | null;
  expira_em: Date | null;
  ambiente: "sandbox" | "producao";
  pago_em: Date | null;
  conferido_em: Date | null;
}

const SELECT = `SELECT p.id::text, p.metodo, p.pedido_id::text, d.numero::text, p.token, p.tid, p.valor::text, p.status, p.qr_emv, p.expira_em, p.ambiente, p.pago_em, p.conferido_em
                  FROM loja.pagamentos p JOIN loja.pedidos d ON d.id = p.pedido_id`;

const paraCobranca = (l: Linha): Cobranca => ({
  token: l.token,
  metodo: l.metodo,
  parcelasMax: l.metodo === "cartao" ? parcelasMaximas(Number(l.valor)) : 1,
  pedidoNumero: Number(l.numero),
  valor: Number(l.valor),
  status: l.status,
  emv: l.status === "pendente" ? l.qr_emv : null,
  expiraEm: l.expira_em ? l.expira_em.toISOString() : null,
  ambiente: l.ambiente,
  pagoEm: l.pago_em ? l.pago_em.toISOString() : null,
});

export type ResultadoCobranca = { ok: true; cobranca: Cobranca } | { ok: false; erro: string };

/** Gera (ou reaproveita, se ainda vale) a cobrança Pix de um pedido. Só o admin chama. */
export async function gerarPix(numero: number): Promise<ResultadoCobranca> {
  const c = configDaRede();
  if (!podeCobrar(c)) return { ok: false, erro: c.ambiente === "producao" ? "Cobrança desligada: REDE_ATIVO não é 1." : "Faltam as credenciais da Rede na Vercel." };
  const banco = db();
  const { rows: ped } = await banco.query<{ id: string; total: string; status: string; pagamento_status: string }>(
    `SELECT id::text, total::text, status, pagamento_status FROM loja.pedidos WHERE numero = $1`,
    [numero],
  );
  const p = ped[0];
  if (!p) return { ok: false, erro: "Pedido não encontrado." };
  if (p.status === "cancelado") return { ok: false, erro: "Pedido cancelado." };
  if (p.pagamento_status === "confirmado") return { ok: false, erro: "Este pedido já está pago." };
  const valor = Number(p.total);
  if (!(valor > 0)) return { ok: false, erro: "Pedido sem valor a cobrar." };

  // Já existe um Pix pendente e válido, do mesmo ambiente e valor? Reaproveita (o cliente pode ter o link aberto).
  const { rows: abertos } = await banco.query<Linha>(
    `${SELECT} WHERE p.pedido_id = $1 AND p.metodo = 'pix' AND p.status = 'pendente' AND p.ambiente = $2 AND p.valor = $3 AND p.expira_em > now() + interval '10 minutes'
      ORDER BY p.criado_em DESC LIMIT 1`,
    [p.id, c.ambiente, valor],
  );
  if (abertos[0]) return { ok: true, cobranca: paraCobranca(abertos[0]) };

  const agora = Date.now();
  const referencia = referenciaDoPedido(numero, agora);
  const expira = agora + minutosDoPix() * 60_000;
  const r = await criarPixNaRede(c, referencia, Math.round(valor * 100), expira);
  if (!r.ok || !r.tid || !r.emv) return { ok: false, erro: `A Rede não gerou o Pix${r.codigo ? ` (código ${r.codigo})` : ""}: ${r.mensagem ?? "sem resposta"}` };

  const token = randomBytes(18).toString("base64url");
  const { rows } = await banco.query<Linha>(
    `INSERT INTO loja.pagamentos (pedido_id, metodo, ambiente, referencia, tid, token, valor, status, qr_emv, expira_em, retorno_codigo, retorno_mensagem, conferido_em)
     VALUES ($1, 'pix', $2, $3, $4, $5, $6, 'pendente', $7, $8, $9, $10, now())
     RETURNING id::text, 'pix'::text AS metodo, pedido_id::text, $11::text AS numero, token, tid, valor::text, status, qr_emv, expira_em, ambiente, pago_em, conferido_em`,
    [p.id, c.ambiente, referencia, r.tid, token, valor, r.emv, new Date(expira), r.codigo, r.mensagem, String(numero)],
  );
  await banco.query(`UPDATE loja.pedidos SET pagamento_metodo = 'pix', pagamento_ref = $2, atualizado_em = now() WHERE id = $1`, [p.id, referencia]);
  return { ok: true, cobranca: paraCobranca(rows[0]) };
}

/** Atualiza uma cobrança consultando a Rede. Se aprovou, marca o pedido como pago (uma vez só, em transação). */
async function conferir(l: Linha, forcar = false): Promise<Linha> {
  if (l.status !== "pendente" || !l.tid) return l;
  if (!forcar && !precisaConferir(l.conferido_em, Date.now())) return l;
  const c = configDaRede();
  if (c.ambiente !== l.ambiente) return l; // credenciais de outro ambiente: não dá para consultar
  const r = await consultarPixNaRede(c, l.tid);
  const banco = db();
  if (!r.status || r.status === "pendente") {
    const venceu = l.expira_em && l.expira_em.getTime() < Date.now() - 5 * 60_000;
    await banco.query(`UPDATE loja.pagamentos SET conferido_em = now(), status = CASE WHEN $2 THEN 'expirado' ELSE status END, atualizado_em = now() WHERE id = $1 AND status = 'pendente'`, [l.id, Boolean(venceu)]);
    return { ...l, conferido_em: new Date(), status: venceu ? "expirado" : l.status };
  }
  const cli = await banco.connect();
  try {
    await cli.query("BEGIN");
    const { rowCount } = await cli.query(
      `UPDATE loja.pagamentos SET status = $2, retorno_codigo = $3, conferido_em = now(), atualizado_em = now(), pago_em = CASE WHEN $2 = 'pago' THEN now() ELSE pago_em END
        WHERE id = $1 AND status = 'pendente'`,
      [l.id, r.status, r.codigo],
    );
    if (rowCount && r.status === "pago") {
      await cli.query(
        `UPDATE loja.pedidos SET pagamento_status = 'confirmado', status = CASE WHEN status = 'aguardando_pagamento' THEN 'pago' ELSE status END, atualizado_em = now() WHERE id = $1`,
        [l.pedido_id],
      );
    }
    await cli.query("COMMIT");
  } catch (e) {
    await cli.query("ROLLBACK").catch(() => {});
    throw e;
  } finally {
    cli.release();
  }
  return { ...l, status: r.status, conferido_em: new Date(), pago_em: r.status === "pago" ? new Date() : l.pago_em };
}

/** A página /pagar/<token>: devolve a cobrança, conferindo na Rede se estiver pendente. */
export async function cobrancaPorToken(token: string, conferirAgora = true): Promise<Cobranca | null> {
  if (!/^[A-Za-z0-9_-]{20,40}$/.test(token)) return null;
  const { rows } = await db().query<Linha>(`${SELECT} WHERE p.token = $1`, [token]);
  if (!rows[0]) return null;
  return paraCobranca(conferirAgora ? await conferir(rows[0]).catch(() => rows[0]) : rows[0]);
}

/** O admin pede para conferir agora a última cobrança do pedido. */
export async function conferirPedido(numero: number): Promise<Cobranca | null> {
  const { rows } = await db().query<Linha>(`${SELECT} WHERE d.numero = $1 ORDER BY p.criado_em DESC LIMIT 1`, [numero]);
  if (!rows[0]) return null;
  return paraCobranca(await conferir(rows[0], true));
}

/** Aviso (webhook) da Rede: guarda o evento e confere a cobrança daquele TID na própria Rede (o aviso sozinho não vale como pagamento). */
export async function receberAviso(tid: string | null, eventos: string[], corpo: unknown): Promise<void> {
  const banco = db();
  await banco.query(`INSERT INTO loja.pagamentos_eventos (tid, eventos, corpo) VALUES ($1, $2, $3)`, [tid, eventos, JSON.stringify(corpo ?? null).slice(0, 4000)]);
  if (!tid) return;
  const { rows } = await banco.query<Linha>(`${SELECT} WHERE p.tid = $1`, [tid]);
  if (rows[0]) await conferir(rows[0], true);
}

/** Última cobrança de cada pedido (para o painel). Sem a migration aplicada, devolve vazio. */
export async function ultimasCobrancas(numeros: number[]): Promise<Record<number, Cobranca>> {
  if (!numeros.length) return {};
  try {
    const { rows } = await db().query<Linha>(
      `SELECT DISTINCT ON (d.numero) p.id::text, p.metodo, p.pedido_id::text, d.numero::text, p.token, p.tid, p.valor::text, p.status, p.qr_emv, p.expira_em, p.ambiente, p.pago_em, p.conferido_em
         FROM loja.pagamentos p JOIN loja.pedidos d ON d.id = p.pedido_id
        WHERE d.numero = ANY($1::bigint[]) ORDER BY d.numero, p.criado_em DESC`,
      [numeros],
    );
    return Object.fromEntries(rows.map((r) => [Number(r.numero), paraCobranca(r)]));
  } catch {
    return {};
  }
}

/** Devolve ao cliente o Pix pago de um pedido (ex.: faltou estoque). Só o admin chama. Marca a cobrança e o pedido. */
export async function devolverPix(numero: number): Promise<{ ok: true } | { ok: false; erro: string }> {
  const banco = db();
  const { rows } = await banco.query<Linha>(`${SELECT} WHERE d.numero = $1 AND p.status = 'pago' ORDER BY p.criado_em DESC LIMIT 1`, [numero]);
  const l = rows[0];
  if (!l || !l.tid) return { ok: false, erro: "Este pedido não tem pagamento online pago para devolver." };
  const c = configDaRede();
  if (c.ambiente !== l.ambiente) return { ok: false, erro: "As credenciais da Rede são de outro ambiente (sandbox/produção) que o deste pagamento." };
  const r = await devolverPixNaRede(c, l.tid, Math.round(Number(l.valor) * 100));
  if (!r.ok) return { ok: false, erro: `A Rede não devolveu${r.codigo ? ` (código ${r.codigo})` : ""}: ${r.mensagem ?? "sem resposta"}` };
  await banco.query(`UPDATE loja.pagamentos SET status = 'cancelado', retorno_codigo = $2, retorno_mensagem = $3, atualizado_em = now() WHERE id = $1`, [l.id, r.codigo, r.mensagem]);
  await banco.query(`UPDATE loja.pedidos SET pagamento_status = 'estornado', status = 'cancelado', atualizado_em = now() WHERE id = $1`, [l.pedido_id]);
  return { ok: true };
}

// ---------------------------------------------------------------- cartão de crédito

/** O cartão só liga com CARTAO_ATIVO=1 (além das credenciais e do REDE_ATIVO em produção). */
export const cartaoAtivo = (env: Record<string, string | undefined> = process.env) => env.CARTAO_ATIVO === "1";

/** Quanto tempo o link de pagamento por cartão fica aberto (horas). */
const HORAS_DO_LINK_DO_CARTAO = 48;
const TENTATIVAS_POR_HORA = 5;

/** Gera (ou reaproveita) o link de pagamento por cartão de um pedido. O valor vem do pedido gravado. */
export async function gerarCartao(numero: number): Promise<ResultadoCobranca> {
  if (!cartaoAtivo()) return { ok: false, erro: "Cartão desligado: falta CARTAO_ATIVO=1 na Vercel." };
  const c = configDaRede();
  if (!podeCobrar(c)) return { ok: false, erro: c.ambiente === "producao" ? "Cobrança desligada: REDE_ATIVO não é 1." : "Faltam as credenciais da Rede na Vercel." };
  const banco = db();
  const { rows: ped } = await banco.query<{ id: string; total: string; status: string; pagamento_status: string }>(
    `SELECT id::text, total::text, status, pagamento_status FROM loja.pedidos WHERE numero = $1`,
    [numero],
  );
  const p = ped[0];
  if (!p) return { ok: false, erro: "Pedido não encontrado." };
  if (p.status === "cancelado") return { ok: false, erro: "Pedido cancelado." };
  if (p.pagamento_status === "confirmado") return { ok: false, erro: "Este pedido já está pago." };
  const valor = Number(p.total);
  if (!(valor > 0)) return { ok: false, erro: "Pedido sem valor a cobrar." };

  const { rows: abertos } = await banco.query<Linha>(
    `${SELECT} WHERE p.pedido_id = $1 AND p.metodo = 'cartao' AND p.status = 'pendente' AND p.ambiente = $2 AND p.valor = $3 AND p.expira_em > now() + interval '1 hour'
      ORDER BY p.criado_em DESC LIMIT 1`,
    [p.id, c.ambiente, valor],
  );
  if (abertos[0]) return { ok: true, cobranca: paraCobranca(abertos[0]) };

  const agora = Date.now();
  const referencia = referenciaDoPedido(numero, agora);
  const token = randomBytes(18).toString("base64url");
  const { rows } = await banco.query<Linha>(
    `INSERT INTO loja.pagamentos (pedido_id, metodo, ambiente, referencia, token, valor, status, expira_em)
     VALUES ($1, 'cartao', $2, $3, $4, $5, 'pendente', $6)
     RETURNING id::text, 'cartao'::text AS metodo, pedido_id::text, $7::text AS numero, token, tid, valor::text, status, qr_emv, expira_em, ambiente, pago_em, conferido_em`,
    [p.id, c.ambiente, referencia, token, valor, new Date(agora + HORAS_DO_LINK_DO_CARTAO * 3_600_000), String(numero)],
  );
  await banco.query(`UPDATE loja.pedidos SET pagamento_metodo = 'cartao', pagamento_ref = $2, atualizado_em = now() WHERE id = $1`, [p.id, referencia]);
  return { ok: true, cobranca: paraCobranca(rows[0]) };
}

export type ResultadoCartao = { ok: true } | { ok: false; erro: string; final?: boolean };

/**
 * Cobra o cartão digitado na página /pagar/<token>. O número nunca é gravado nem registrado em log.
 * A linha da cobrança fica travada (FOR UPDATE) durante a chamada à Rede: dois cliques seguidos não cobram duas vezes.
 */
export async function pagarComCartao(token: string, entrada: EntradaCartao): Promise<ResultadoCartao> {
  if (!/^[A-Za-z0-9_-]{20,40}$/.test(token)) return { ok: false, erro: "Link inválido.", final: true };
  if (!cartaoAtivo()) return { ok: false, erro: "O pagamento por cartão não está disponível agora. Fale com a loja pelo WhatsApp.", final: true };
  const c = configDaRede();
  const banco = db();
  const cli = await banco.connect();
  try {
    await cli.query("BEGIN");
    const { rows } = await cli.query<{ id: string; pedido_id: string; numero: string; valor: string; status: string; metodo: string; ambiente: string; expira_em: Date | null; pedido_status: string; pagamento_status: string }>(
      `SELECT p.id::text, p.pedido_id::text, d.numero::text, p.valor::text, p.status, p.metodo, p.ambiente, p.expira_em, d.status AS pedido_status, d.pagamento_status
         FROM loja.pagamentos p JOIN loja.pedidos d ON d.id = p.pedido_id WHERE p.token = $1 FOR UPDATE OF p`,
      [token],
    );
    const l = rows[0];
    if (!l || l.metodo !== "cartao") {
      await cli.query("ROLLBACK");
      return { ok: false, erro: "Cobrança não encontrada.", final: true };
    }
    if (l.status === "pago" || l.pagamento_status === "confirmado") {
      await cli.query("ROLLBACK");
      return { ok: true };
    }
    if (l.status !== "pendente" || l.pedido_status === "cancelado" || (l.expira_em && l.expira_em.getTime() < Date.now())) {
      await cli.query("ROLLBACK");
      return { ok: false, erro: "Este link não está mais disponível. Fale com a loja pelo WhatsApp.", final: true };
    }
    if (!podeCobrar(c) || c.ambiente !== l.ambiente) {
      await cli.query("ROLLBACK");
      return { ok: false, erro: "O pagamento por cartão não está disponível agora. Fale com a loja pelo WhatsApp.", final: true };
    }
    const valor = Number(l.valor);
    const v = validarCartao(entrada, valor);
    if (!v.ok) {
      await cli.query("ROLLBACK");
      return { ok: false, erro: v.erro };
    }
    const { rows: tent } = await cli.query<{ n: string }>(
      `SELECT count(*)::text AS n FROM loja.pagamentos_eventos WHERE eventos = ARRAY['cartao_tentativa'] AND corpo->>'p' = $1 AND recebido_em > now() - interval '1 hour'`,
      [l.id],
    );
    if (Number(tent[0]?.n ?? 0) >= TENTATIVAS_POR_HORA) {
      await cli.query("ROLLBACK");
      return { ok: false, erro: "Muitas tentativas. Aguarde um pouco ou fale com a loja pelo WhatsApp." };
    }
    await cli.query(`INSERT INTO loja.pagamentos_eventos (tid, eventos, corpo) VALUES (NULL, ARRAY['cartao_tentativa'], $1)`, [JSON.stringify({ p: l.id })]);

    const referencia = referenciaDoPedido(Number(l.numero), Date.now());
    const r = await cobrarCartaoNaRede(c, referencia, Math.round(valor * 100), v.dados, process.env.REDE_SOFT_DESCRIPTOR);
    if (r.aprovado && r.tid) {
      await cli.query(
        `UPDATE loja.pagamentos SET status = 'pago', referencia = $2, tid = $3, retorno_codigo = $4, retorno_mensagem = $5, pago_em = now(), conferido_em = now(), atualizado_em = now() WHERE id = $1`,
        [l.id, referencia, r.tid, r.codigo, r.resumo ?? r.mensagem],
      );
      await cli.query(
        `UPDATE loja.pedidos SET pagamento_metodo = 'cartao', pagamento_ref = $2, pagamento_status = 'confirmado', status = CASE WHEN status = 'aguardando_pagamento' THEN 'pago' ELSE status END, atualizado_em = now() WHERE id = $1`,
        [l.pedido_id, referencia],
      );
      await cli.query("COMMIT");
      return { ok: true };
    }
    if (r.semAcesso) {
      console.error("cartão: sem acesso à Rede:", (r.mensagem ?? "").slice(0, 160));
      await cli.query("COMMIT");
      return { ok: false, erro: "O pagamento por cartão está indisponível agora. Tente novamente em alguns minutos ou fale com a loja pelo WhatsApp." };
    }
    if (r.semResposta) {
      // Não dá para saber se cobrou: trava o link para ninguém pagar duas vezes; a loja confere na Rede.
      await cli.query(`UPDATE loja.pagamentos SET status = 'erro', referencia = $2, retorno_codigo = 'sem_resposta', retorno_mensagem = $3, atualizado_em = now() WHERE id = $1`, [l.id, referencia, (r.mensagem ?? "").slice(0, 200)]);
      await cli.query("COMMIT");
      return { ok: false, erro: "Não conseguimos confirmar o pagamento. NÃO tente de novo: fale com a loja pelo WhatsApp que conferimos.", final: true };
    }
    await cli.query(`UPDATE loja.pagamentos SET referencia = $2, retorno_codigo = $3, retorno_mensagem = $4, conferido_em = now(), atualizado_em = now() WHERE id = $1`, [l.id, referencia, r.codigo, (r.mensagem ?? "").slice(0, 200)]);
    await cli.query("COMMIT");
    return { ok: false, erro: "O pagamento não foi autorizado. Confira os dados ou use outro cartão." };
  } catch (e) {
    await cli.query("ROLLBACK").catch(() => {});
    console.error("cartão: falha interna", e instanceof Error ? e.message.slice(0, 120) : "erro");
    return { ok: false, erro: "Não foi possível processar agora. Tente novamente em instantes." };
  } finally {
    cli.release();
  }
}
