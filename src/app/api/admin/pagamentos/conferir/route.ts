import { NextResponse } from "next/server";
import { admLogado } from "@/lib/admin";
import { bancoLigado } from "@/lib/db";
import { conferirPedido } from "@/lib/pagamentos";

export const dynamic = "force-dynamic";

/** Confere agora, na Rede, a última cobrança do pedido. Só admin. */
export async function POST(req: Request) {
  if (!(await admLogado())) return NextResponse.json({ erro: "Não autorizado." }, { status: 401 });
  if (!bancoLigado()) return NextResponse.json({ erro: "Banco não ligado." }, { status: 503 });
  const c = (await req.json().catch(() => null)) as { numero?: unknown } | null;
  const numero = Number(c?.numero);
  if (!Number.isInteger(numero) || numero <= 0) return NextResponse.json({ erro: "Pedido inválido." }, { status: 400 });
  try {
    const cobranca = await conferirPedido(numero);
    return cobranca ? NextResponse.json({ cobranca }) : NextResponse.json({ erro: "Este pedido não tem cobrança." }, { status: 404 });
  } catch {
    return NextResponse.json({ erro: "Não foi possível conferir agora." }, { status: 500 });
  }
}
