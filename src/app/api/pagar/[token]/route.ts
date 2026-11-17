import { NextResponse } from "next/server";
import { bancoLigado } from "@/lib/db";
import { cobrancaPorToken } from "@/lib/pagamentos";

export const dynamic = "force-dynamic";

/** Situação da cobrança para a página do cliente (atualiza sozinha). Só quem tem o link (token secreto) vê. */
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  if (!bancoLigado()) return NextResponse.json({ erro: "Indisponível." }, { status: 503 });
  const { token } = await params;
  const c = await cobrancaPorToken(token).catch(() => null);
  if (!c) return NextResponse.json({ erro: "Cobrança não encontrada." }, { status: 404 });
  return NextResponse.json({ status: c.status, pagoEm: c.pagoEm }, { headers: { "Cache-Control": "no-store" } });
}
