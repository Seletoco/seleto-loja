import { NextResponse } from "next/server";
import { bancoLigado, db } from "@/lib/db";
import { sessaoAtual } from "@/lib/sessao";
import { buscar, garantirCatalogo, novidades } from "@/lib/catalogo";
import type { Produto } from "@/lib/tipos";

export const dynamic = "force-dynamic";

/**
 * Vitrine "Para você": primeiro o que o cliente pediu para ser avisado (no tamanho pedido, quando houver), depois novidades.
 * Não usa o histórico de compras (ele fica protegido até a confirmação por WhatsApp).
 */
export async function GET() {
  const s = await sessaoAtual();
  if (!s?.contaId) return NextResponse.json({ erro: "Entre na sua conta." }, { status: 401 });
  await garantirCatalogo();
  const escolhidos: Produto[] = [];
  const add = (p: Produto) => {
    if (p.foto && !escolhidos.some((x) => x.ref === p.ref) && escolhidos.length < 8) escolhidos.push(p);
  };
  if (s.cpfHash && bancoLigado()) {
    const { rows } = await db()
      .query<{ descricao: string; tamanho: string | null }>(`SELECT descricao, tamanho FROM loja.alertas_produto WHERE cpf_hash = $1 AND ativo ORDER BY criado_em DESC LIMIT 5`, [s.cpfHash])
      .catch(() => ({ rows: [] as { descricao: string; tamanho: string | null }[] }));
    for (const a of rows) {
      const achados = buscar({ q: a.descricao, ordem: "novo" });
      const noTamanho = a.tamanho ? achados.filter((p) => p.tamanhos.includes(a.tamanho!)) : [];
      (noTamanho.length ? noTamanho : achados).slice(0, 3).forEach(add);
    }
  }
  novidades(16).forEach(add);
  return NextResponse.json({ produtos: escolhidos }, { headers: { "Cache-Control": "no-store" } });
}
