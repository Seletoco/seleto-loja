/**
 * Números e listas do painel do admin. Só leitura, só o que o dono precisa para operar o site.
 * Nada de custo nem margem de produto aqui (regra do projeto).
 */
import { db } from "./db";
import { MODO_REAL, EXIGIR_LOGIN, blackFridayAtiva } from "./modo";
import { adminBloqueado, usandoCredencialDeTeste } from "./admin";
import { configDaRede, podeCobrar } from "./rede";
import { SITE_URL } from "./site";
import { LINK_AVALIACAO_GOOGLE, telefoneGeral } from "./lojas";

const semTabela = (e: unknown) => (e as { code?: string }).code === "42P01";

export interface Periodo {
  pedidos: number;
  valor: number;
}

export interface ResumoSite {
  hoje: Periodo;
  semana: Periodo;
  mes: Periodo;
  ticketMedio30: number;
  porStatus: Record<string, number>;
  pixPagos30: Periodo;
  aguardandoPagamento: number;
  contas: { total: number; ligadas: number; novas30: number };
  alertasAtivos: number;
}

/** Resumo do site. Pedidos cancelados não entram nos valores. Datas no horário de Brasília. */
export async function resumoDoSite(): Promise<ResumoSite> {
  const banco = db();
  const dia = `(criado_em AT TIME ZONE 'America/Sao_Paulo')::date`;
  const hoje = `(now() AT TIME ZONE 'America/Sao_Paulo')::date`;
  const [v, st, contas, alertas] = await Promise.all([
    banco.query<Record<string, string>>(
      `SELECT count(*) FILTER (WHERE ${dia} = ${hoje}) AS hoje_n,
              coalesce(sum(total) FILTER (WHERE ${dia} = ${hoje}), 0) AS hoje_v,
              count(*) FILTER (WHERE ${dia} > ${hoje} - 7) AS semana_n,
              coalesce(sum(total) FILTER (WHERE ${dia} > ${hoje} - 7), 0) AS semana_v,
              count(*) FILTER (WHERE ${dia} > ${hoje} - 30) AS mes_n,
              coalesce(sum(total) FILTER (WHERE ${dia} > ${hoje} - 30), 0) AS mes_v,
              count(*) FILTER (WHERE ${dia} > ${hoje} - 30 AND pagamento_status = 'confirmado') AS pix_n,
              coalesce(sum(total) FILTER (WHERE ${dia} > ${hoje} - 30 AND pagamento_status = 'confirmado'), 0) AS pix_v
         FROM loja.pedidos WHERE status <> 'cancelado'`,
    ),
    banco.query<{ status: string; n: string }>(`SELECT status, count(*) AS n FROM loja.pedidos GROUP BY status`),
    banco
      .query<{ total: string; ligadas: string; novas: string }>(
        `SELECT count(*) AS total, count(*) FILTER (WHERE cpf_hash IS NOT NULL) AS ligadas, count(*) FILTER (WHERE criado_em > now() - interval '30 days') AS novas FROM loja.contas`,
      )
      .catch((e) => (semTabela(e) ? { rows: [{ total: "0", ligadas: "0", novas: "0" }] } : Promise.reject(e))),
    banco
      .query<{ n: string }>(`SELECT count(*) AS n FROM loja.alertas_produto WHERE ativo`)
      .catch((e) => (semTabela(e) ? { rows: [{ n: "0" }] } : Promise.reject(e))),
  ]);
  const r = v.rows[0] ?? {};
  const num = (k: string) => Number(r[k] ?? 0);
  const porStatus = Object.fromEntries(st.rows.map((x) => [x.status, Number(x.n)]));
  return {
    hoje: { pedidos: num("hoje_n"), valor: num("hoje_v") },
    semana: { pedidos: num("semana_n"), valor: num("semana_v") },
    mes: { pedidos: num("mes_n"), valor: num("mes_v") },
    ticketMedio30: num("mes_n") ? Math.round((num("mes_v") / num("mes_n")) * 100) / 100 : 0,
    porStatus,
    pixPagos30: { pedidos: num("pix_n"), valor: num("pix_v") },
    aguardandoPagamento: porStatus.aguardando_pagamento ?? 0,
    contas: { total: Number(contas.rows[0].total), ligadas: Number(contas.rows[0].ligadas), novas30: Number(contas.rows[0].novas) },
    alertasAtivos: Number(alertas.rows[0].n),
  };
}

export interface ContaAdmin {
  email: string;
  nome: string | null;
  ligada: boolean;
  verificada: boolean;
  criadaEm: string;
  ultimoLogin: string | null;
}

/** Contas do site (sem CPF: só se está ligada ao cadastro). */
export async function listarContas(limite = 200): Promise<ContaAdmin[]> {
  const { rows } = await db()
    .query<{ email: string; nome: string | null; ligada: boolean; verificado: boolean; criado_em: Date; ultimo_login: Date | null }>(
      `SELECT email, nome, cpf_hash IS NOT NULL AS ligada, verificado, criado_em, ultimo_login FROM loja.contas ORDER BY criado_em DESC LIMIT $1`,
      [limite],
    )
    .catch((e) => (semTabela(e) ? { rows: [] } : Promise.reject(e)));
  return rows.map((c) => ({ email: c.email, nome: c.nome, ligada: c.ligada, verificada: c.verificado, criadaEm: c.criado_em.toISOString(), ultimoLogin: c.ultimo_login?.toISOString() ?? null }));
}

/** O que os clientes pediram para ser avisados (agrupado, sem identificar ninguém). */
export async function alertasAgrupados(limite = 50): Promise<{ descricao: string; tamanho: string | null; pedidos: number; ultimo: string }[]> {
  const { rows } = await db()
    .query<{ descricao: string; tamanho: string | null; n: string; ultimo: Date }>(
      `SELECT min(descricao) AS descricao, tamanho, count(*) AS n, max(criado_em) AS ultimo
         FROM loja.alertas_produto WHERE ativo GROUP BY lower(trim(descricao)), tamanho ORDER BY count(*) DESC, max(criado_em) DESC LIMIT $1`,
      [limite],
    )
    .catch((e) => (semTabela(e) ? { rows: [] } : Promise.reject(e)));
  return rows.map((a) => ({ descricao: a.descricao, tamanho: a.tamanho, pedidos: Number(a.n), ultimo: a.ultimo.toISOString() }));
}

/** Produtos vendáveis no sistema que ainda não têm foto (não aparecem no site). */
export async function produtosSemFoto(limite = 60): Promise<{ total: number; vendaveis: number; lista: { ref: string; nome: string; marca: string | null; categoria: string | null }[] }> {
  const banco = db();
  try {
    const [cont, lista] = await Promise.all([
      banco.query<{ vendaveis: string; sem: string }>(
        `SELECT count(*) AS vendaveis, count(*) FILTER (WHERE NOT EXISTS (SELECT 1 FROM loja.v_fotos f WHERE f.ref = p.ref)) AS sem
           FROM loja.v_produtos p WHERE p.variacoes_vendaveis > 0`,
      ),
      banco.query<{ ref: string; nome: string; marca: string | null; categoria: string | null }>(
        `SELECT p.ref, p.nome, p.marca, p.categoria FROM loja.v_produtos p
          WHERE p.variacoes_vendaveis > 0 AND NOT EXISTS (SELECT 1 FROM loja.v_fotos f WHERE f.ref = p.ref)
          ORDER BY p.estoque_rede DESC NULLS LAST LIMIT $1`,
        [limite],
      ),
    ]);
    return { total: Number(cont.rows[0].sem), vendaveis: Number(cont.rows[0].vendaveis), lista: lista.rows };
  } catch (e) {
    if (semTabela(e)) return { total: 0, vendaveis: 0, lista: [] };
    throw e;
  }
}

export interface PagamentoAdmin {
  numero: number;
  cliente: string;
  metodo: string;
  ambiente: string;
  valor: number;
  status: string;
  criadoEm: string;
  pagoEm: string | null;
}

/** Cobranças e avisos da Rede. Sem a migration 013, avisa em vez de quebrar. */
export async function pagamentosRecentes(): Promise<{ semTabela: boolean; lista: PagamentoAdmin[]; eventos: { recebidoEm: string; tid: string | null; eventos: string[] }[] }> {
  const banco = db();
  try {
    const [p, e] = await Promise.all([
      banco.query<{ numero: string; cliente_nome: string; metodo: string; ambiente: string; valor: string; status: string; criado_em: Date; pago_em: Date | null }>(
        `SELECT d.numero::text, d.cliente_nome, p.metodo, p.ambiente, p.valor::text, p.status, p.criado_em, p.pago_em
           FROM loja.pagamentos p JOIN loja.pedidos d ON d.id = p.pedido_id ORDER BY p.criado_em DESC LIMIT 100`,
      ),
      banco.query<{ recebido_em: Date; tid: string | null; eventos: string[] | null }>(`SELECT recebido_em, tid, eventos FROM loja.pagamentos_eventos ORDER BY recebido_em DESC LIMIT 30`),
    ]);
    return {
      semTabela: false,
      lista: p.rows.map((x) => ({ numero: Number(x.numero), cliente: x.cliente_nome, metodo: x.metodo, ambiente: x.ambiente, valor: Number(x.valor), status: x.status, criadoEm: x.criado_em.toISOString(), pagoEm: x.pago_em?.toISOString() ?? null })),
      eventos: e.rows.map((x) => ({ recebidoEm: x.recebido_em.toISOString(), tid: x.tid, eventos: x.eventos ?? [] })),
    };
  } catch (err) {
    if (semTabela(err)) return { semTabela: true, lista: [], eventos: [] };
    throw err;
  }
}

export interface ItemConfig {
  grupo: string;
  nome: string;
  ok: boolean;
  detalhe: string;
}

/** O que está ligado e o que falta. Só presença das variáveis, nunca os valores. */
export function configuracaoDoSite(env: Record<string, string | undefined> = process.env): ItemConfig[] {
  const tem = (k: string) => Boolean(env[k]?.trim());
  const rede = configDaRede(env);
  return [
    { grupo: "Site", nome: "Modo real", ok: MODO_REAL, detalhe: MODO_REAL ? "Ligado: aberto ao Google, sem avisos de teste." : "Desligado (NEXT_PUBLIC_MODO_REAL)." },
    { grupo: "Site", nome: "Endereço do site", ok: true, detalhe: tem("NEXT_PUBLIC_SITE_URL") ? SITE_URL : `${SITE_URL} (padrão; defina NEXT_PUBLIC_SITE_URL ao ter domínio próprio)` },
    { grupo: "Site", nome: "Banco de dados", ok: tem("LOJA_DATABASE_URL"), detalhe: tem("LOJA_DATABASE_URL") ? "Ligado." : "Falta LOJA_DATABASE_URL." },
    { grupo: "Site", nome: "Sessão dos clientes", ok: (env.LOJA_SESSAO_SECRET?.length ?? 0) >= 32, detalhe: (env.LOJA_SESSAO_SECRET?.length ?? 0) >= 32 ? "Segredo definido." : "LOJA_SESSAO_SECRET ausente ou curto (mín. 32)." },
    { grupo: "Admin", nome: "Senha do admin", ok: !adminBloqueado() && !usandoCredencialDeTeste(), detalhe: usandoCredencialDeTeste() ? "Usando a senha de teste." : "Senha própria definida." },
    { grupo: "Contato", nome: "WhatsApp da Seleto", ok: Boolean(telefoneGeral()), detalhe: telefoneGeral() ? "Balão, rodapé e cards ligados." : "Falta NEXT_PUBLIC_WHATSAPP_SELETO." },
    { grupo: "Contato", nome: "Avaliação no Google", ok: Boolean(LINK_AVALIACAO_GOOGLE), detalhe: LINK_AVALIACAO_GOOGLE ? "Botão de avaliar ligado." : "Falta NEXT_PUBLIC_GOOGLE_AVALIACAO_URL (o card de R$ 50 fica sem botão)." },
    { grupo: "Vendas", nome: "Exigir login para comprar", ok: true, detalhe: EXIGIR_LOGIN ? "Sim." : "Não (NEXT_PUBLIC_EXIGIR_LOGIN)." },
    { grupo: "Vendas", nome: "Black Friday", ok: true, detalhe: blackFridayAtiva() ? "Faixa e popup aparecendo." : "Desligada." },
    { grupo: "Vendas", nome: "Frete dos Correios", ok: tem("CORREIOS_USUARIO") && tem("CORREIOS_CODIGO_ACESSO"), detalhe: tem("CORREIOS_USUARIO") && tem("CORREIOS_CODIGO_ACESSO") ? "Credenciais definidas." : "Sem credenciais: frete estimado." },
    { grupo: "Pagamento", nome: "Rede: credenciais", ok: Boolean(rede.clientId && rede.clientSecret), detalhe: rede.clientId && rede.clientSecret ? `Definidas (${rede.ambiente === "producao" ? "produção" : "sandbox"}).` : "Faltam REDE_PV e REDE_CLIENT_SECRET." },
    { grupo: "Pagamento", nome: "Rede: cobrança", ok: podeCobrar(rede), detalhe: rede.ambiente === "sandbox" ? "Sandbox: gera Pix de teste." : rede.ativo ? "Produção: cobrando." : "Produção desligada (REDE_ATIVO=0)." },
  ];
}
