import { createHmac } from "node:crypto";
import QRCode from "qrcode";
import { NextResponse } from "next/server";
import { bancoLigado } from "@/lib/db";
import { sessaoAtual } from "@/lib/sessao";

export const dynamic = "force-dynamic";
const VALE_S = 600;

/**
 * QR do cliente para o caixa: um código assinado que vale 10 minutos e traz só um pedaço do hash do CPF (nunca o CPF).
 * A leitura no caixa (tela do vendedor no SeleChat) ainda não existe — por enquanto o QR é só demonstração.
 */
export async function GET() {
  const s = await sessaoAtual();
  if (!s) return NextResponse.json({ erro: "Sessão expirada." }, { status: 401 });
  if (!s.cpfHash) return NextResponse.json({ erro: "Ligue sua conta ao cadastro da Seleto primeiro (CPF e celular)." }, { status: 403 });
  const segredo = process.env.LOJA_SESSAO_SECRET ?? (bancoLigado() ? "" : "somente-demonstracao-sem-banco");
  if (!segredo) return NextResponse.json({ erro: "indisponível" }, { status: 503 });
  const exp = Math.floor(Date.now() / 1000) + VALE_S;
  const corpo = `${s.cpfHash.slice(0, 16)}.${exp}`;
  const assinatura = createHmac("sha256", segredo).update(`qr:${corpo}`).digest("base64url").slice(0, 22);
  const imagem = await QRCode.toDataURL(`SELETO1.${corpo}.${assinatura}`, { margin: 1, width: 360, errorCorrectionLevel: "M" });
  return NextResponse.json({ imagem, validoSegundos: VALE_S });
}
