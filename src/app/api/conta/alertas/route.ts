import { NextResponse } from "next/server";
import { bancoLigado, db } from "@/lib/db";
import { sessaoAtual } from "@/lib/sessao";

const MAX_ATIVOS = 10;

/** Cria ({descricao, tamanho}) ou remove ({remover: id}) um pedido de "me avise quando chegar". */
export async function POST(req: Request) {
  const s = await sessaoAtual();
  if (!s) return NextResponse.json({ erro: "Sessão expirada." }, { status: 401 });
  if (!s.cpfHash) return NextResponse.json({ erro: "Ligue sua conta ao cadastro da Seleto primeiro (CPF e celular)." }, { status: 403 });
  const c = (await req.json().catch(() => null)) as { descricao?: unknown; tamanho?: unknown; remover?: unknown } | null;
  if (!c) return NextResponse.json({ erro: "Pedido inválido." }, { status: 400 });

  if (typeof c.remover === "string") {
    if (bancoLigado() && /^\d+$/.test(c.remover)) await db().query(`UPDATE loja.alertas_produto SET ativo = false WHERE id = $1 AND cpf_hash = $2`, [c.remover, s.cpfHash]);
    return NextResponse.json({ ok: true });
  }
  const descricao = String(c.descricao ?? "").trim().slice(0, 120);
  const tamanho = String(c.tamanho ?? "").trim().slice(0, 12) || null;
  if (descricao.length < 2) return NextResponse.json({ erro: "Diga qual produto você quer (ex.: Tênis de corrida)." }, { status: 400 });
  if (!bancoLigado()) return NextResponse.json({ id: `d${Date.now()}`, descricao, tamanho });
  const banco = db();
  const { rows: n } = await banco.query<{ n: string }>(`SELECT count(*) AS n FROM loja.alertas_produto WHERE cpf_hash = $1 AND ativo`, [s.cpfHash]);
  if (Number(n[0]?.n ?? 0) >= MAX_ATIVOS) return NextResponse.json({ erro: `Você já tem ${MAX_ATIVOS} avisos. Remova algum para criar outro.` }, { status: 400 });
  const { rows } = await banco.query<{ id: string }>(`INSERT INTO loja.alertas_produto (cpf_hash, descricao, tamanho) VALUES ($1, $2, $3) RETURNING id::text`, [s.cpfHash, descricao, tamanho]);
  return NextResponse.json({ id: rows[0].id, descricao, tamanho });
}
