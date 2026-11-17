import { NextResponse } from "next/server";
import { bancoLigado } from "@/lib/db";
import { configDaRede, podeCobrar } from "@/lib/rede";

export const dynamic = "force-dynamic";

/** O checkout pergunta se já dá para pagar com Pix na hora (sem expor nada da configuração). */
export async function GET() {
  const c = configDaRede();
  const pix = bancoLigado() && podeCobrar(c);
  return NextResponse.json({ pix, teste: pix && c.ambiente === "sandbox" }, { headers: { "Cache-Control": "no-store" } });
}
