/** Apoio às rotas da conta por e-mail e senha: freio por tentativas (tabela loja.tentativas_login) e formatação. */
import { createHash } from "node:crypto";
import { db } from "@/lib/db";

export const hashCurto = (texto: string) => createHash("sha256").update(texto, "utf8").digest("hex").slice(0, 12);

/** Quantas tentativas COM FALHA houve para esta chave na janela (minutos). */
export async function falhasRecentes(chave: string, minutos: number): Promise<number> {
  const { rows } = await db().query<{ n: string }>(
    `SELECT count(*) AS n FROM loja.tentativas_login WHERE telefone = $1 AND ok = false AND criado_em > now() - make_interval(mins => $2)`,
    [chave, minutos],
  );
  return Number(rows[0]?.n ?? 0);
}

/** Registra uma tentativa. A chave nunca contém e-mail, CPF ou telefone puros: só um pedaço de hash. */
export async function registrarTentativa(chave: string, ip: string, ok: boolean): Promise<void> {
  await db().query(`INSERT INTO loja.tentativas_login (telefone, ip, ok) VALUES ($1, $2, $3)`, [chave, ip, ok]);
}

export const primeiroNome = (nome: string) => nome.trim().split(/\s+/)[0]?.slice(0, 40) ?? "";
