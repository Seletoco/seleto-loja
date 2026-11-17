import { NextResponse } from "next/server";
import { admLogado } from "@/lib/admin";
import { bancoLigado } from "@/lib/db";
import { liberarParaPdvnet } from "@/lib/pdvnet-pedidos";

export const dynamic = "force-dynamic";

/** Libera (ou retira a liberação de) um pedido para o PDVNet baixar e emitir a nota. Só admin. */
export async function POST(req: Request) {
  if (!(await admLogado())) return NextResponse.json({ erro: "Não autorizado." }, { status: 401 });
  if (!bancoLigado()) return NextResponse.json({ erro: "Banco não ligado." }, { status: 503 });
  const c = (await req.json().catch(() => null)) as { numero?: unknown; liberar?: unknown } | null;
  const numero = Number(c?.numero);
  if (!Number.isInteger(numero) || numero <= 0) return NextResponse.json({ erro: "Pedido inválido." }, { status: 400 });
  try {
    const r = await liberarParaPdvnet(numero, c?.liberar !== false);
    return r.ok ? NextResponse.json({ liberadoEm: r.liberadoEm }) : NextResponse.json({ erro: r.erro }, { status: 422 });
  } catch (e) {
    const semColuna = (e as { code?: string }).code === "42703";
    return NextResponse.json({ erro: semColuna ? "Falta aplicar a migration 015 (colunas do PDVNet no pedido)." : "Não foi possível agora." }, { status: 500 });
  }
}
