import { NextResponse } from "next/server";
import { admLogado } from "@/lib/admin";
import { bancoLigado } from "@/lib/db";
import { mudarStatus } from "@/lib/pedidos-admin";

/** Muda o status de um pedido (só admin logado). */
export async function PATCH(req: Request) {
  if (!(await admLogado())) return NextResponse.json({ erro: "Não autorizado." }, { status: 401 });
  if (!bancoLigado()) return NextResponse.json({ erro: "Banco não ligado." }, { status: 503 });
  const c = (await req.json().catch(() => null)) as { numero?: unknown; status?: unknown } | null;
  const numero = Number(c?.numero);
  if (!Number.isInteger(numero) || numero <= 0 || typeof c?.status !== "string") return NextResponse.json({ erro: "Pedido inválido." }, { status: 400 });
  return (await mudarStatus(numero, c.status)) ? NextResponse.json({ ok: true }) : NextResponse.json({ erro: "Pedido ou status inválido." }, { status: 404 });
}
