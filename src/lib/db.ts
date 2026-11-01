/**
 * Acesso ao banco da loja — SOMENTE pelo perfil restrito `loja_app` (ver supabase/migrations).
 * `LOJA_DATABASE_URL` é a string de conexão desse perfil. Sem ela, o site roda em modo demonstração.
 */
import { Pool } from "pg";

let pool: Pool | null = null;

export const bancoLigado = () => Boolean(process.env.LOJA_DATABASE_URL);

export function db(): Pool {
  if (!process.env.LOJA_DATABASE_URL) throw new Error("LOJA_DATABASE_URL não configurada");
  pool ??= new Pool({ connectionString: process.env.LOJA_DATABASE_URL, max: 3, ssl: { rejectUnauthorized: false } });
  return pool;
}
