import { NextResponse } from "next/server";
import { admLogado } from "@/lib/admin";
import { bancoLigado } from "@/lib/db";
import { devolverPix } from "@/lib/pagamentos";

export const dynamic = "force-dynamic";

/** Devolve o Pix pago de um pedido (valor total). Só admin. */
export async function POST(req: Request) {
  if (!(await admLogado())) return NextResponse.json({ erro: "Não autorizado." }, { status: 401 });
  if (!bancoLigado()) return NextResponse.json({ erro: "Banco não ligado." }, { status: 503 });
  const c = (await req.json().catch(() => null)) as { numero?: unknown } | null;
  const numero = Number(c?.numero);
  if (!Number.isInteger(numero) || numero <= 0) return NextResponse.json({ erro: "Pedido inválido." }, { status: 400 });
  try {
    const r = await devolverPix(numero);
    return r.ok ? NextResponse.json({ ok: true }) : NextResponse.json({ erro: r.erro }, { status: 422 });
  } catch {
    return NextResponse.json({ erro: "Não foi possível devolver agora." }, { status: 500 });
  }
}
