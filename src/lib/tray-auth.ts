/**
 * Autenticação da "API Tray" que o site oferece ao PDVNet (parte 2 da integração de nota fiscal).
 * Variáveis (Vercel, Sensitive): TRAY_CONSUMER_KEY, TRAY_CONSUMER_SECRET, TRAY_CODIGO, TRAY_SEGREDO_TOKEN.
 * Sem as quatro, a API real fica desligada. Os tokens são assinados (HMAC) e expiram: nada é guardado no banco.
 */
import { createHash, createHmac, timingSafeEqual } from "node:crypto";

type Env = Record<string, string | undefined>;

export interface ConfigTray {
  key: string;
  secret: string;
  codigo: string;
  segredo: string;
}

export function configDaTray(env: Env = process.env): ConfigTray | null {
  const c = { key: env.TRAY_CONSUMER_KEY ?? "", secret: env.TRAY_CONSUMER_SECRET ?? "", codigo: env.TRAY_CODIGO ?? "", segredo: env.TRAY_SEGREDO_TOKEN ?? "" };
  return c.key && c.secret && c.codigo && c.segredo.length >= 16 ? c : null;
}

/** Comparação em tempo constante (compara os hashes, então o tamanho não vaza). */
export function iguais(a: unknown, b: string): boolean {
  const h = (x: string) => createHash("sha256").update(x, "utf8").digest();
  return typeof a === "string" && timingSafeEqual(h(a), h(b));
}

export function credenciaisOk(c: ConfigTray, e: { key?: unknown; secret?: unknown; code?: unknown }): boolean {
  // as três comparações sempre rodam (sem curto-circuito)
  const a = iguais(e.key, c.key);
  const b = iguais(e.secret, c.secret);
  const d = iguais(e.code, c.codigo);
  return a && b && d;
}

const assinar = (c: ConfigTray, tipo: "a" | "r", exp: number) => createHmac("sha256", c.segredo).update(`${tipo}.${exp}`).digest("base64url");
const FORMATO = /^([ar])\.(\d{10,13})\.([A-Za-z0-9_-]{43})$/;

export const VALIDADE_ACESSO_MS = 60 * 60_000; // 1 h
export const VALIDADE_RENOVACAO_MS = 30 * 24 * 3_600_000; // 30 dias

export function emitirTokens(c: ConfigTray, agoraMs: number) {
  const ea = agoraMs + VALIDADE_ACESSO_MS;
  const er = agoraMs + VALIDADE_RENOVACAO_MS;
  return { access_token: `a.${ea}.${assinar(c, "a", ea)}`, refresh_token: `r.${er}.${assinar(c, "r", er)}`, expiraAcessoMs: ea, expiraRenovacaoMs: er };
}

export function tokenValido(c: ConfigTray, token: unknown, tipo: "a" | "r", agoraMs: number): boolean {
  if (typeof token !== "string") return false;
  const m = FORMATO.exec(token);
  if (!m || m[1] !== tipo) return false;
  const exp = Number(m[2]);
  return exp > agoraMs && iguais(m[3], assinar(c, tipo, exp));
}

const dataHora = (ms: number) => {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" })
      .formatToParts(new Date(ms))
      .map((x) => [x.type, x.value]),
  );
  return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}:${p.second}`;
};

/** Resposta de /web_api/auth no formato da Tray. */
export function respostaDeAuth(c: ConfigTray, origem: string, agoraMs: number) {
  const t = emitirTokens(c, agoraMs);
  return {
    code: 200,
    message: "OK",
    access_token: t.access_token,
    refresh_token: t.refresh_token,
    date_expiration_access_token: dataHora(t.expiraAcessoMs),
    date_expiration_refresh_token: dataHora(t.expiraRenovacaoMs),
    date_activated: dataHora(agoraMs),
    api_host: `${origem}/web_api`,
    store_id: "1",
  };
}
