import { NextResponse } from "next/server";
import { admLogado } from "@/lib/admin";
import { bancoLigado } from "@/lib/db";
import { gerarCartao } from "@/lib/pagamentos";

export const dynamic = "force-dynamic";

/** Gera (ou reaproveita) o link de cartão de um pedido. Só admin. O valor vem do pedido gravado, nunca do navegador. */
export async function POST(req: Request) {
  if (!(await admLogado())) return NextResponse.json({ erro: "Não autorizado." }, { status: 401 });
  if (!bancoLigado()) return NextResponse.json({ erro: "Banco não ligado." }, { status: 503 });
  const c = (await req.json().catch(() => null)) as { numero?: unknown } | null;
  const numero = Number(c?.numero);
  if (!Number.isInteger(numero) || numero <= 0) return NextResponse.json({ erro: "Pedido inválido." }, { status: 400 });
  try {
    const r = await gerarCartao(numero);
    return r.ok ? NextResponse.json({ cobranca: r.cobranca }) : NextResponse.json({ erro: r.erro }, { status: 422 });
  } catch (e) {
    const semTabela = (e as { code?: string }).code === "42P01";
    return NextResponse.json({ erro: semTabela ? "Falta aplicar a migration 013 (tabela de pagamentos)." : "Não foi possível gerar o link de cartão agora." }, { status: 500 });
  }
}
