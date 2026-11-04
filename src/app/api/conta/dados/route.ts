import { NextResponse } from "next/server";
import { dadosDoCliente } from "@/lib/conta-servidor";
import { sessaoAtual } from "@/lib/sessao";

export const dynamic = "force-dynamic";

export async function GET() {
  const s = await sessaoAtual();
  if (!s) return NextResponse.json({ erro: "Sessão expirada." }, { status: 401 });
  const dados = await dadosDoCliente(s.cpfHash, s.verificado);
  if (!dados) return NextResponse.json({ erro: "Cadastro não encontrado." }, { status: 404 });
  return NextResponse.json(dados);
}
