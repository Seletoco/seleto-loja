/**
 * Sessão do admin — cookie assinado (HMAC), sem banco.
 *
 * Credenciais vêm das variáveis de ambiente `ADMIN_USUARIO` e `ADMIN_SENHA`. Sem elas, vale um
 * par de TESTE (abaixo) só para você entrar e avaliar o painel — troque na Vercel antes de ir ao ar.
 * `ADMIN_SEGREDO` assina o cookie; sem ele, usa um valor de teste (qualquer um pode forjar o cookie
 * se souber, então defina na Vercel).
 */
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { bancoLigado } from "@/lib/db";

export const COOKIE = "seleto_admin";
const DURACAO_S = 60 * 60 * 8;

const usuario = () => process.env.ADMIN_USUARIO ?? "admin";
const senha = () => process.env.ADMIN_SENHA ?? "seleto-teste-2026";
const segredo = () => process.env.ADMIN_SEGREDO ?? "segredo-de-teste-troque-na-vercel";
/** Verdadeiro enquanto estiver usando as credenciais de teste embutidas. */
export const usandoCredencialDeTeste = () => !process.env.ADMIN_SENHA;
/**
 * Site real (banco ligado): as credenciais e o segredo de teste NUNCA valem. Sem ADMIN_SENHA forte e ADMIN_SEGREDO
 * definidos na Vercel, o admin fica bloqueado (em vez de aceitar uma senha que está no código).
 */
export const adminBloqueado = () => bancoLigado() && (!process.env.ADMIN_SENHA || process.env.ADMIN_SENHA.length < 12 || !process.env.ADMIN_SEGREDO || process.env.ADMIN_SEGREDO.length < 16);

const assinar = (texto: string) => createHmac("sha256", segredo()).update(texto).digest("hex");
const iguais = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

export function credenciaisValidas(u: string, s: string): boolean {
  if (adminBloqueado()) return false;
  return iguais(u, usuario()) && iguais(s, senha());
}

export function criarToken(): string {
  const expira = String(Math.floor(Date.now() / 1000) + DURACAO_S);
  return `${usuario()}.${expira}.${assinar(`${usuario()}.${expira}`)}`;
}

function tokenValido(token: string | undefined): boolean {
  if (!token) return false;
  const [u, expira, assinatura] = token.split(".");
  if (!u || !expira || !assinatura) return false;
  if (Number(expira) < Date.now() / 1000) return false;
  return iguais(assinatura, assinar(`${u}.${expira}`));
}

export async function admLogado(): Promise<boolean> {
  if (adminBloqueado()) return false;
  return tokenValido((await cookies()).get(COOKIE)?.value);
}

export const opcoesCookie = { httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/", maxAge: DURACAO_S };
