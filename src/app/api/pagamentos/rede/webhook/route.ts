import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { bancoLigado } from "@/lib/db";
import { lerAvisoPix } from "@/lib/rede";
import { receberAviso } from "@/lib/pagamentos";

export const dynamic = "force-dynamic";

/**
 * Aviso da Rede (webhook do Pix: PV.UPDATE_TRANSACTION_PIX / PV.REFUND_PIX). O aviso NÃO vale sozinho como pagamento:
 * o site consulta a transação na Rede pelo TID e só então marca o pedido. Se REDE_WEBHOOK_SEGREDO estiver definido,
 * o cabeçalho Authorization precisa ser igual a ele (é o valor combinado com a Rede no cadastro do aviso).
 */
export async function POST(req: Request) {
  const segredo = process.env.REDE_WEBHOOK_SEGREDO;
  if (segredo) {
    const veio = Buffer.from(req.headers.get("authorization") ?? "");
    const esperado = Buffer.from(segredo);
    if (veio.length !== esperado.length || !timingSafeEqual(veio, esperado)) return NextResponse.json({ erro: "Não autorizado." }, { status: 401 });
  }
  const corpo = await req.json().catch(() => null);
  if (!corpo || typeof corpo !== "object") return NextResponse.json({ erro: "Corpo inválido." }, { status: 400 });
  if (!bancoLigado()) return NextResponse.json({ ok: true });
  const { tid, eventos } = lerAvisoPix(corpo);
  try {
    await receberAviso(tid, eventos, corpo);
  } catch {
    /* responde 200 mesmo assim: a conferência também acontece pela página do cliente e pelo painel */
  }
  return NextResponse.json({ ok: true });
}
