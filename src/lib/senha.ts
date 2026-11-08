/** Senha do cliente: nunca guardada, só o hash (scrypt com sal aleatório). Formato: scrypt$N$sal$hash (base64url). */
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const N = 16384; // custo: ~50 ms por conferência, caro o bastante para barrar força bruta offline
const TAM = 64;

export function hashSenha(senha: string): string {
  const sal = randomBytes(16);
  const h = scryptSync(senha.normalize("NFKC"), sal, TAM, { N });
  return `scrypt$${N}$${sal.toString("base64url")}$${h.toString("base64url")}`;
}

export function senhaConfere(senha: string, guardado: string | null | undefined): boolean {
  const [alg, n, sal, h] = (guardado ?? "").split("$");
  if (alg !== "scrypt" || !n || !sal || !h) return false;
  try {
    const esperado = Buffer.from(h, "base64url");
    const calculado = scryptSync(senha.normalize("NFKC"), Buffer.from(sal, "base64url"), esperado.length, { N: Number(n) });
    return esperado.length === calculado.length && timingSafeEqual(esperado, calculado);
  } catch {
    return false;
  }
}

/** Hash de mentira, para gastar o mesmo tempo quando o e-mail não existe (não revela se a conta existe). */
export const HASH_FALSO = hashSenha("senha-que-ninguem-usa-" + "x".repeat(8));

export const emailValido = (e: string) => e.length <= 160 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e);

/** Regra simples e honesta: 8+ caracteres, sem exigir símbolos esquisitos. */
export function erroDeSenha(s: string): string | null {
  if (s.length < 8) return "A senha precisa ter pelo menos 8 caracteres.";
  if (s.length > 100) return "A senha é muito longa.";
  if (/^(.)\1+$/.test(s) || ["12345678", "123456789", "senha123", "password"].includes(s.toLowerCase())) return "Escolha uma senha menos óbvia.";
  return null;
}
