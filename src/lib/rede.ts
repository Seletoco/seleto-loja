/**
 * Rede (e.Rede / Rede Labs) — conexão com a API. Por enquanto SÓ o token OAuth 2.0 (client credentials):
 * serve para conferir se as credenciais na Vercel estão certas. Nenhuma cobrança é feita aqui.
 *
 * Endereços informados pelo portal da Rede (17/11/2026):
 *   sandbox  https://rl7-sandbox-api.useredecloud.com.br
 *   produção https://api.userede.com.br/redelabs
 * Token: POST {base}/oauth2/token (confirmado: sem credencial responde 401 nos dois).
 *
 * Credenciais (manual da Rede, "Step-by-step OAuth 2.0"): no Portal Use Rede, o PV vira o clientId e a Chave de Integração vira
 * o clientSecret. Token vale 24 min; nas APIs vai como "Authorization: Bearer {access_token}".
 * Transações (próxima etapa): sandbox https://sandbox-erede.useredecloud.com.br/v2/transactions,
 * produção https://api.userede.com.br/erede/v2/transactions.
 *
 * Segredos só nas variáveis de ambiente (REDE_PV ou REDE_CLIENT_ID; REDE_CLIENT_SECRET = Chave de Integração). Nada de segredo ou token sai daqui
 * para o navegador nem para o log.
 */

export type AmbienteRede = "sandbox" | "producao";

export const BASE_DA_REDE: Record<AmbienteRede, string> = {
  sandbox: "https://rl7-sandbox-api.useredecloud.com.br",
  producao: "https://api.userede.com.br/redelabs",
};

export interface ConfigRede {
  ambiente: AmbienteRede;
  ativo: boolean;
  clientId: string | null;
  clientSecret: string | null;
  pv: string | null;
}

type Env = Record<string, string | undefined>;

/** Lê a configuração. Sem REDE_AMBIENTE, fica no sandbox (nunca cai em produção por engano). */
export function configDaRede(env: Env = process.env): ConfigRede {
  const amb = (env.REDE_AMBIENTE ?? "").trim().toLowerCase();
  const limpo = (v: string | undefined) => (v && v.trim() ? v.trim() : null);
  return {
    ambiente: amb === "producao" || amb === "produção" ? "producao" : "sandbox",
    ativo: env.REDE_ATIVO === "1",
    clientId: limpo(env.REDE_CLIENT_ID) ?? limpo(env.REDE_PV), // o PV É o clientId

    clientSecret: limpo(env.REDE_CLIENT_SECRET),
    pv: limpo(env.REDE_PV),
  };
}

/** O que mostrar no painel: só se cada variável existe, nunca o valor. */
export function resumoDaConfig(c: ConfigRede) {
  return {
    ambiente: c.ambiente,
    ativo: c.ativo,
    temClientId: Boolean(c.clientId),
    temClientSecret: Boolean(c.clientSecret),
    temPv: Boolean(c.pv),
    pronto: Boolean(c.clientId && c.clientSecret),
  };
}

/** Monta o pedido de token (OAuth 2.0 client credentials, com as credenciais no cabeçalho Basic). */
export function pedidoDeToken(c: ConfigRede): { url: string; init: RequestInit } {
  const basic = Buffer.from(`${c.clientId}:${c.clientSecret}`, "utf8").toString("base64");
  return {
    url: `${BASE_DA_REDE[c.ambiente]}/oauth2/token`,
    init: {
      method: "POST",
      headers: { Authorization: `Basic ${basic}`, "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
      body: "grant_type=client_credentials",
      cache: "no-store",
    },
  };
}

export interface TokenRede {
  accessToken: string;
  expiraEmMs: number;
}

/** Lê a resposta do token. Desconta 60 s da validade para nunca usar um token no limite. */
export function lerToken(json: unknown, agoraMs: number): TokenRede | null {
  const j = (json ?? {}) as { access_token?: unknown; expires_in?: unknown };
  if (typeof j.access_token !== "string" || !j.access_token) return null;
  const seg = Number(j.expires_in);
  const validade = Number.isFinite(seg) && seg > 0 ? seg : 300;
  return { accessToken: j.access_token, expiraEmMs: agoraMs + Math.max(0, validade - 60) * 1000 };
}

/** Mensagem curta e sem dados sensíveis para o painel. */
export function mensagemDeErro(status: number, corpo: string): string {
  if (status === 401 || status === 403) return `A Rede recusou as credenciais (HTTP ${status}). Confira o client ID e o client secret e se são do mesmo ambiente (sandbox ou produção).`;
  if (status === 0) return "Sem resposta da Rede (rede fora ou tempo esgotado).";
  const curto = corpo.replace(/\s+/g, " ").slice(0, 160);
  return `A Rede respondeu HTTP ${status}${curto ? `: ${curto}` : ""}`;
}

const cache = globalThis as unknown as { _tokenRede?: TokenRede & { chave: string } };

export type ResultadoToken = { ok: true; token: TokenRede } | { ok: false; erro: string };

/** Pede (ou reaproveita) o token. Timeout de 10 s. */
export async function obterTokenRede(c: ConfigRede = configDaRede(), forcar = false): Promise<ResultadoToken> {
  if (!c.clientId || !c.clientSecret) return { ok: false, erro: "Faltam REDE_PV (o PV) e/ou REDE_CLIENT_SECRET (a Chave de Integração) na Vercel." };
  const chave = `${c.ambiente}:${c.clientId}`;
  const guardado = cache._tokenRede;
  if (!forcar && guardado && guardado.chave === chave && Date.now() < guardado.expiraEmMs) return { ok: true, token: guardado };
  const { url, init } = pedidoDeToken(c);
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), 10_000);
  try {
    const r = await fetch(url, { ...init, signal: abort.signal });
    const texto = await r.text();
    if (!r.ok) return { ok: false, erro: mensagemDeErro(r.status, texto) };
    let json: unknown = null;
    try {
      json = JSON.parse(texto);
    } catch {
      /* resposta não é JSON */
    }
    const token = lerToken(json, Date.now());
    if (!token) return { ok: false, erro: "A Rede respondeu, mas sem access_token. Confira a documentação do token." };
    cache._tokenRede = { ...token, chave };
    return { ok: true, token };
  } catch {
    return { ok: false, erro: mensagemDeErro(0, "") };
  } finally {
    clearTimeout(timer);
  }
}

// ---------------------------------------------------------------- transações (Pix)

/** Endereço das transações (manual da Rede, "Endpoints"). */
export const TRANSACOES_DA_REDE: Record<AmbienteRede, string> = {
  sandbox: "https://sandbox-erede.useredecloud.com.br/v2/transactions",
  producao: "https://api.userede.com.br/erede/v2/transactions",
};

/** Cobrar de verdade só em produção com REDE_ATIVO=1. No sandbox (testes) sempre pode, porque nada é cobrado. */
export const podeCobrar = (c: ConfigRede) => Boolean(c.clientId && c.clientSecret) && (c.ambiente === "sandbox" || c.ativo);

/** "reference" da Rede: até 16 caracteres alfanuméricos, único por tentativa. Ex.: SL123k3j9x2 */
export function referenciaDoPedido(numero: number, agoraMs: number): string {
  return `SL${numero}${agoraMs.toString(36)}`.replace(/[^A-Za-z0-9]/g, "").slice(0, 16);
}

/** Data/hora de Brasília no formato que a Rede pede para o vencimento do QR Code: AAAA-MM-DDThh:mm:ss. */
export function horaDeBrasilia(ms: number): string {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" })
      .formatToParts(new Date(ms))
      .map((x) => [x.type, x.value]),
  );
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}`;
}

/** Corpo do pedido de QR Code Pix (manual: "QR Code Pix request"). Valor em centavos, sem separadores. */
export function corpoPix(referencia: string, valorCentavos: number, expiraEmMs: number) {
  return { kind: "pix", reference: referencia, amount: valorCentavos, qrCode: { dateTimeExpiration: horaDeBrasilia(expiraEmMs) } };
}

export type StatusPagamento = "pendente" | "pago" | "cancelado" | "expirado" | "erro";

export interface RespostaPix {
  ok: boolean;
  tid: string | null;
  emv: string | null;
  expiraEm: string | null;
  codigo: string | null;
  mensagem: string | null;
}

/** Lê a resposta do pedido de QR Code. Sucesso = returnCode "00" com tid e o "copia e cola". */
export function lerRespostaPix(json: unknown): RespostaPix {
  const j = (json ?? {}) as Record<string, unknown>;
  const qr = (j.qrCodeResponse ?? {}) as Record<string, unknown>;
  const codigo = j.returnCode != null ? String(j.returnCode) : null;
  const tid = typeof j.tid === "string" && j.tid ? j.tid : null;
  const emv = typeof qr.qrCodeData === "string" && qr.qrCodeData ? qr.qrCodeData : null;
  const expiraEm = typeof qr.dateTimeExpiration === "string" ? qr.dateTimeExpiration : null;
  return { ok: codigo === "00" && Boolean(tid && emv), tid, emv, expiraEm, codigo, mensagem: j.returnMessage != null ? String(j.returnMessage).slice(0, 200) : null };
}

/** Lê a consulta da transação (GET /v2/transactions/{tid}). Pendente vem em qrCodeResponse; aprovado em authorization. */
export function lerConsultaPix(json: unknown): { status: StatusPagamento | null; codigo: string | null } {
  const j = (json ?? {}) as Record<string, unknown>;
  const bloco = ((j.authorization ?? j.qrCodeResponse ?? {}) as Record<string, unknown>);
  const codigo = j.returnCode != null ? String(j.returnCode) : bloco.returnCode != null ? String(bloco.returnCode) : null;
  if (codigo === "3036") return { status: "expirado", codigo };
  const s = String(bloco.status ?? "").toLowerCase();
  if (s === "approved") return { status: "pago", codigo };
  if (s === "canceled" || s === "cancelled") return { status: "cancelado", codigo };
  if (s === "pending") return { status: "pendente", codigo };
  return { status: null, codigo };
}

/** Do aviso (webhook) da Rede, só o identificador da transação e os eventos. */
export function lerAvisoPix(json: unknown): { tid: string | null; eventos: string[] } {
  const j = (json ?? {}) as Record<string, unknown>;
  const d = (j.data ?? {}) as Record<string, unknown>;
  const tid = [d.id, d.qrcode].find((x) => typeof x === "string" && /^[A-Za-z0-9]{6,40}$/.test(x)) as string | undefined;
  const eventos = Array.isArray(j.events) ? j.events.filter((e): e is string => typeof e === "string").slice(0, 10) : [];
  return { tid: tid ?? null, eventos };
}

async function chamarRede(c: ConfigRede, url: string, init: RequestInit): Promise<{ status: number; json: unknown; texto: string }> {
  const t = await obterTokenRede(c);
  if (!t.ok) return { status: 0, json: null, texto: t.erro };
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), 15_000);
  try {
    const r = await fetch(url, {
      ...init,
      cache: "no-store",
      signal: abort.signal,
      headers: { Authorization: `Bearer ${t.token.accessToken}`, "Content-Type": "application/json", Accept: "application/json", ...(init.headers ?? {}) },
    });
    const texto = await r.text();
    let json: unknown = null;
    try {
      json = JSON.parse(texto);
    } catch {
      /* não é JSON */
    }
    return { status: r.status, json, texto };
  } catch {
    return { status: 0, json: null, texto: "Sem resposta da Rede." };
  } finally {
    clearTimeout(timer);
  }
}

/** Pede o QR Code Pix à Rede. */
export async function criarPixNaRede(c: ConfigRede, referencia: string, valorCentavos: number, expiraEmMs: number): Promise<RespostaPix & { http: number }> {
  const r = await chamarRede(c, TRANSACOES_DA_REDE[c.ambiente], { method: "POST", body: JSON.stringify(corpoPix(referencia, valorCentavos, expiraEmMs)) });
  const lido = lerRespostaPix(r.json);
  if (!lido.ok && !lido.mensagem) lido.mensagem = r.status ? mensagemDeErro(r.status, r.texto) : r.texto;
  return { ...lido, http: r.status };
}

/** Consulta a transação pelo TID. */
export async function consultarPixNaRede(c: ConfigRede, tid: string): Promise<{ status: StatusPagamento | null; codigo: string | null; http: number }> {
  const r = await chamarRede(c, `${TRANSACOES_DA_REDE[c.ambiente]}/${encodeURIComponent(tid)}`, { method: "GET" });
  return { ...lerConsultaPix(r.json), http: r.status };
}

/** Devolução (total ou parcial) de um Pix pago. Manual: POST /v2/transactions/{tid}/refunds { amount }; sucesso = returnCode "359". Até 90 dias. */
export function lerRespostaDevolucao(json: unknown): { ok: boolean; codigo: string | null; mensagem: string | null } {
  const j = (json ?? {}) as Record<string, unknown>;
  const codigo = j.returnCode != null ? String(j.returnCode) : null;
  return { ok: codigo === "359", codigo, mensagem: j.returnMessage != null ? String(j.returnMessage).slice(0, 200) : null };
}

export async function devolverPixNaRede(c: ConfigRede, tid: string, valorCentavos: number): Promise<{ ok: boolean; codigo: string | null; mensagem: string | null; http: number }> {
  const r = await chamarRede(c, `${TRANSACOES_DA_REDE[c.ambiente]}/${encodeURIComponent(tid)}/refunds`, { method: "POST", body: JSON.stringify({ amount: valorCentavos }) });
  const lido = lerRespostaDevolucao(r.json);
  if (!lido.ok && !lido.mensagem) lido.mensagem = r.status ? mensagemDeErro(r.status, r.texto) : r.texto;
  return { ...lido, http: r.status };
}

// ---------------------------------------------------------------- cartão de crédito (checkout transparente)
// O cartão passa pelo nosso servidor só no instante da cobrança: nunca é gravado, registrado em log nem devolvido ao navegador.

export interface EntradaCartao {
  numero?: unknown;
  nome?: unknown;
  validade?: unknown;
  cvv?: unknown;
  parcelas?: unknown;
}

export interface DadosCartao {
  numero: string;
  nome: string;
  mes: number;
  ano: number;
  cvv: string;
  parcelas: number;
}

/** Confere o número do cartão pelo dígito verificador (Luhn). */
export function luhnOk(numero: string): boolean {
  if (!/^[0-9]{13,19}$/.test(numero)) return false;
  let soma = 0;
  for (let i = 0; i < numero.length; i++) {
    let d = Number(numero[numero.length - 1 - i]);
    if (i % 2 === 1) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    soma += d;
  }
  return soma % 10 === 0;
}

/** Quantas parcelas sem juros a loja oferece para este valor. CARTAO_PARCELAS_MAX (1 a 12, padrão 1 = só à vista) e CARTAO_PARCELA_MINIMA (padrão R$ 50). */
export function parcelasMaximas(valor: number, env: Env = process.env): number {
  const max = Math.min(12, Math.max(1, Math.round(Number(env.CARTAO_PARCELAS_MAX) || 1)));
  const minima = Number(env.CARTAO_PARCELA_MINIMA) > 0 ? Number(env.CARTAO_PARCELA_MINIMA) : 50;
  return Math.max(1, Math.min(max, Math.floor(valor / minima)));
}

/** Valida o que o cliente digitou. Mensagens em português, sem repetir o dado digitado. */
export function validarCartao(e: EntradaCartao, valor: number, agora = new Date(), env: Env = process.env): { ok: true; dados: DadosCartao } | { ok: false; erro: string } {
  const numero = String(e.numero ?? "").replace(/[\s-]/g, "");
  if (!luhnOk(numero)) return { ok: false, erro: "Confira o número do cartão." };
  const nome = String(e.nome ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z ]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase()
    .slice(0, 30);
  if (nome.length < 2) return { ok: false, erro: "Informe o nome como está no cartão." };
  const m = /^\s*(\d{1,2})\s*\/\s*(\d{2}|\d{4})\s*$/.exec(String(e.validade ?? ""));
  if (!m) return { ok: false, erro: "Informe a validade no formato MM/AA." };
  const mes = Number(m[1]);
  const ano = m[2].length === 2 ? 2000 + Number(m[2]) : Number(m[2]);
  if (mes < 1 || mes > 12) return { ok: false, erro: "Mês de validade inválido." };
  const fim = new Date(ano, mes, 1).getTime(); // 1º dia do mês seguinte = fim da validade
  if (fim <= agora.getTime() || ano > agora.getFullYear() + 20) return { ok: false, erro: "Cartão vencido ou validade inválida." };
  const cvv = String(e.cvv ?? "").trim();
  if (!/^[0-9]{3,4}$/.test(cvv)) return { ok: false, erro: "Confira o código de segurança (CVV)." };
  const parcelas = Math.round(Number(e.parcelas ?? 1));
  if (!Number.isInteger(parcelas) || parcelas < 1 || parcelas > parcelasMaximas(valor, env)) return { ok: false, erro: "Número de parcelas inválido." };
  return { ok: true, dados: { numero, nome, mes, ano, cvv, parcelas } };
}

/** Corpo da autorização com captura automática (manual: "Transaction Authorization"). Parcelas só entram de 2 em diante. */
export function corpoCartao(referencia: string, valorCentavos: number, d: DadosCartao, softDescriptor?: string) {
  return {
    capture: true,
    kind: "credit",
    reference: referencia,
    amount: valorCentavos,
    ...(d.parcelas >= 2 ? { installments: d.parcelas } : {}),
    cardholderName: d.nome,
    cardNumber: d.numero,
    expirationMonth: d.mes,
    expirationYear: d.ano,
    securityCode: d.cvv,
    ...(softDescriptor ? { softDescriptor: softDescriptor.replace(/[^A-Za-z0-9 ]/g, "").slice(0, 18) } : {}),
  };
}

export interface RespostaCartao {
  aprovado: boolean;
  tid: string | null;
  codigo: string | null;
  mensagem: string | null;
  /** Ex.: "Mastercard final 0007" (só para o painel; nunca o número inteiro). */
  resumo: string | null;
}

/** Lê a resposta da autorização. Aprovado = returnCode "00" com tid. */
export function lerRespostaCartao(json: unknown): RespostaCartao {
  const j = (json ?? {}) as Record<string, unknown>;
  const codigo = j.returnCode != null ? String(j.returnCode) : null;
  const tid = typeof j.tid === "string" && j.tid ? j.tid : null;
  const marca = typeof (j.brand as { name?: unknown } | undefined)?.name === "string" ? String((j.brand as { name: string }).name).replace(/\.$/, "") : null;
  const final = typeof j.last4 === "string" && /^[0-9]{4}$/.test(j.last4) ? j.last4 : null;
  return {
    aprovado: codigo === "00" && Boolean(tid),
    tid,
    codigo,
    mensagem: j.returnMessage != null ? String(j.returnMessage).slice(0, 200) : null,
    resumo: [marca, final && `final ${final}`].filter(Boolean).join(" ") || null,
  };
}

/** Pede a autorização do cartão à Rede. `semResposta` = não sabemos se cobrou (não tentar de novo sozinho). */
export async function cobrarCartaoNaRede(c: ConfigRede, referencia: string, valorCentavos: number, d: DadosCartao, softDescriptor?: string): Promise<RespostaCartao & { http: number; semResposta: boolean; semAcesso: boolean }> {
  // Sem token a cobrança nem sai: é seguro tentar de novo depois (não confundir com "sem resposta").
  const t = await obterTokenRede(c);
  if (!t.ok) return { aprovado: false, tid: null, codigo: null, mensagem: t.erro, resumo: null, http: 0, semResposta: false, semAcesso: true };
  const r = await chamarRede(c, TRANSACOES_DA_REDE[c.ambiente], { method: "POST", body: JSON.stringify(corpoCartao(referencia, valorCentavos, d, softDescriptor)) });
  const lido = lerRespostaCartao(r.json);
  const semResposta = r.status === 0 || r.status >= 500 || (r.status >= 200 && r.status < 300 && r.json == null);
  if (!lido.aprovado && !lido.mensagem) lido.mensagem = r.status ? mensagemDeErro(r.status, "") : "Sem resposta da Rede.";
  return { ...lido, http: r.status, semResposta, semAcesso: false };
}
