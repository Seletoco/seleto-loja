import { NextResponse } from "next/server";
import { bancoLigado, db } from "@/lib/db";
import { sessaoAtual } from "@/lib/sessao";

/** Liga/desliga os avisos (LGPD). O SeleChat consulta `loja.preferencias` antes de mandar mensagem. */
export async function POST(req: Request) {
  const s = await sessaoAtual();
  if (!s) return NextResponse.json({ erro: "Sessão expirada." }, { status: 401 });
  if (!s.cpfHash) return NextResponse.json({ erro: "Ligue sua conta ao cadastro da Seleto primeiro (CPF e celular)." }, { status: 403 });
  const c = (await req.json().catch(() => null)) as { avisosCashback?: unknown; avisosPromocoes?: unknown } | null;
  if (!c || typeof c.avisosCashback !== "boolean" || typeof c.avisosPromocoes !== "boolean") return NextResponse.json({ erro: "Pedido inválido." }, { status: 400 });
  if (bancoLigado()) {
    await db().query(
      `INSERT INTO loja.preferencias (cpf_hash, avisos_cashback, avisos_promocoes) VALUES ($1, $2, $3)
       ON CONFLICT (cpf_hash) DO UPDATE SET avisos_cashback = $2, avisos_promocoes = $3, atualizado_em = now()`,
      [s.cpfHash, c.avisosCashback, c.avisosPromocoes],
    );
  }
  return NextResponse.json({ ok: true });
}
