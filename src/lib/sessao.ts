/** Sessão da área do cliente: cookie httpOnly assinado (HMAC), sem guardar nada no servidor. Guarda só o hash do CPF e o primeiro nome. */
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { bancoLigado } from "@/lib/db";

export const COOKIE = "seleto_sessao";
const DURACAO_S = 2 * 3600;

function segredo(): string {
  const s = process.env.LOJA_SESSAO_SECRET;
  if (s && s.length >= 16) return s;
  if (!bancoLigado()) return "somente-demonstracao-sem-banco"; // modo demonstração: nada real a proteger
  throw new Error("LOJA_SESSAO_SECRET não configurada");
}
const assinar = (corpo: string) => createHmac("sha256", segredo()).update(corpo).digest("base64url");

export interface Sessao {
  cpfHash: string;
  nome: string;
  /** true só quando o cliente provou ter o WhatsApp (código). Hoje o login é só por CPF, então fica false. */
  verificado: boolean;
}

export function criarToken(s: Sessao): string {
  const corpo = Buffer.from(JSON.stringify({ ...s, exp: Math.floor(Date.now() / 1000) + DURACAO_S })).toString("base64url");
  return `${corpo}.${assinar(corpo)}`;
}

export function lerToken(token: string | undefined): Sessao | null {
  if (!token) return null;
  const [corpo, sig] = token.split(".");
  if (!corpo || !sig) return null;
  const esperado = Buffer.from(assinar(corpo));
  const recebido = Buffer.from(sig);
  if (esperado.length !== recebido.length || !timingSafeEqual(esperado, recebido)) return null;
  try {
    const d = JSON.parse(Buffer.from(corpo, "base64url").toString("utf8")) as Sessao & { exp: number };
    if (!d.exp || d.exp < Date.now() / 1000) return null;
    return { cpfHash: d.cpfHash, nome: d.nome, verificado: d.verificado === true };
  } catch {
    return null;
  }
}

export async function sessaoAtual(): Promise<Sessao | null> {
  return lerToken((await cookies()).get(COOKIE)?.value);
}

export const opcoesCookie = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/", maxAge: DURACAO_S };
