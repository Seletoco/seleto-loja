import { NextResponse } from "next/server";
import { bancoLigado } from "@/lib/db";
import { pagarComCartao } from "@/lib/pagamentos";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const SEM_CACHE = { "Cache-Control": "no-store" };

/** Cobra o cartão digitado na página de pagamento. Só quem tem o link (token secreto) chega aqui. Nada do cartão é gravado nem devolvido. */
export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  if (!bancoLigado()) return NextResponse.json({ erro: "Indisponível." }, { status: 503, headers: SEM_CACHE });
  const { token } = await params;
  const texto = await req.text().catch(() => "");
  if (texto.length > 2000) return NextResponse.json({ erro: "Dados inválidos." }, { status: 413, headers: SEM_CACHE });
  let corpo: unknown = null;
  try {
    corpo = JSON.parse(texto);
  } catch {
    /* corpo inválido */
  }
  if (!corpo || typeof corpo !== "object") return NextResponse.json({ erro: "Dados inválidos." }, { status: 400, headers: SEM_CACHE });
  const r = await pagarComCartao(token, corpo as Record<string, unknown>);
  return r.ok ? NextResponse.json({ ok: true }, { headers: SEM_CACHE }) : NextResponse.json({ erro: r.erro, final: Boolean(r.final) }, { status: r.final ? 409 : 422, headers: SEM_CACHE });
}
