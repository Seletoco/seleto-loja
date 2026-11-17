import { NextResponse } from "next/server";
import { admLogado } from "@/lib/admin";
import { configDaRede, obterTokenRede, resumoDaConfig } from "@/lib/rede";

export const dynamic = "force-dynamic";

/**
 * Testa a conexão com a Rede: só pede o token OAuth (nenhuma cobrança). Só para admin logado.
 * Nunca devolve o token nem as credenciais: só se deu certo e até quando o token vale.
 */
export async function POST() {
  if (!(await admLogado())) return NextResponse.json({ erro: "Não autorizado." }, { status: 401 });
  const c = configDaRede();
  const r = await obterTokenRede(c, true);
  return NextResponse.json({
    config: resumoDaConfig(c),
    ok: r.ok,
    ...(r.ok ? { tokenValeAte: new Date(r.token.expiraEmMs).toISOString() } : { erro: r.erro }),
  });
}
