import { NextResponse } from "next/server";
import { bancoLigado } from "@/lib/db";
import { configDaRede, podeCobrar } from "@/lib/rede";

export const dynamic = "force-dynamic";

/** O checkout pergunta se já dá para pagar com Pix ou cartão na hora (sem expor nada da configuração). */
export async function GET() {
  const c = configDaRede();
  const pode = bancoLigado() && podeCobrar(c);
  // Cartão só liga com CARTAO_ATIVO=1 (o cartão passa pelo nosso servidor: ligue depois de testar no sandbox).
  const cartao = pode && process.env.CARTAO_ATIVO === "1";
  return NextResponse.json({ pix: pode, cartao, teste: pode && c.ambiente === "sandbox" }, { headers: { "Cache-Control": "no-store" } });
}
