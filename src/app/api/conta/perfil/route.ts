import { NextResponse } from "next/server";
import { bancoLigado } from "@/lib/db";
import { perfilDoCadastro } from "@/lib/perfil-servidor";
import { sessaoAtual } from "@/lib/sessao";

export const dynamic = "force-dynamic";

/**
 * Quem está logado e o que dá para preencher no pedido. Só devolve dados do cadastro da PRÓPRIA pessoa (a sessão manda),
 * e só se a conta já estiver ligada ao cadastro (CPF + nome + nascimento + celular conferidos).
 */
export async function GET() {
  const s = await sessaoAtual();
  if (!s) return NextResponse.json({ logado: false });
  if (!s.cpfHash || !bancoLigado()) return NextResponse.json({ logado: true, ligada: false, nome: s.nome });
  const p = await perfilDoCadastro(s.cpfHash);
  if (!p) return NextResponse.json({ logado: true, ligada: false, nome: s.nome });
  return NextResponse.json({ logado: true, ligada: true, nome: p.nome, telefone: p.fone, email: p.email ?? s.email ?? null });
}
