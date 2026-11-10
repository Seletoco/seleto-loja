/** Dados do cadastro da Seleto da PRÓPRIA pessoa logada (a sessão vem do servidor). Nunca receba o CPF do navegador aqui. */
import { db } from "./db";
import { nomeBonito } from "./nome";

export interface PerfilCadastro {
  nome: string; // nome completo, bonito
  fone: string | null; // DDD + número (10 ou 11 dígitos)
  email: string | null;
}

export async function perfilDoCadastro(cpfHash: string): Promise<PerfilCadastro | null> {
  const { rows } = await db().query<{ nome: string; fone: string | null; email: string | null }>(
    `SELECT nome, fone, email FROM loja.v_cliente_identidade WHERE cpf_hash = $1 ORDER BY inativo, data_atualizacao DESC NULLS LAST LIMIT 1`,
    [cpfHash],
  );
  if (!rows[0]) return null;
  return { nome: nomeBonito(rows[0].nome), fone: rows[0].fone, email: rows[0].email };
}
