import { NextResponse } from "next/server";
import { bancoLigado, db } from "@/lib/db";
import { sessaoAtual } from "@/lib/sessao";
import { LOJAS } from "@/lib/lojas";

export const dynamic = "force-dynamic";

/** Pedidos feitos no site por esta conta (só os dela), com o link do Pix quando há um aguardando pagamento. */
export async function GET() {
  const s = await sessaoAtual();
  if (!s?.contaId) return NextResponse.json({ erro: "Entre na sua conta." }, { status: 401 });
  if (!bancoLigado()) return NextResponse.json({ pedidos: [] });
  const banco = db();
  const { rows } = await banco.query<{ id: string; numero: string; criado_em: Date; status: string; total: string; entrega_tipo: string; loja_retirada_id: number | null }>(
    `SELECT id::text, numero::text, criado_em, status, total::text, entrega_tipo, loja_retirada_id FROM loja.pedidos WHERE conta_id = $1 ORDER BY criado_em DESC LIMIT 20`,
    [s.contaId],
  );
  if (!rows.length) return NextResponse.json({ pedidos: [] });
  const ids = rows.map((r) => r.id);
  const [itens, pix] = await Promise.all([
    banco.query<{ pedido_id: string; nome: string; tamanho: string | null; quantidade: number }>(`SELECT pedido_id::text, nome, tamanho, quantidade FROM loja.pedido_itens WHERE pedido_id = ANY($1::uuid[])`, [ids]),
    banco
      .query<{ pedido_id: string; metodo: string; status: string; token: string; expira_em: Date | null }>(
        `SELECT DISTINCT ON (pedido_id) pedido_id::text, metodo, status, token, expira_em FROM loja.pagamentos WHERE pedido_id = ANY($1::uuid[]) ORDER BY pedido_id, criado_em DESC`,
        [ids],
      )
      .catch(() => ({ rows: [] as { pedido_id: string; metodo: string; status: string; token: string; expira_em: Date | null }[] })),
  ]);
  return NextResponse.json(
    {
      pedidos: rows.map((r) => {
        const c = pix.rows.find((p) => p.pedido_id === r.id);
        const pendente = c?.status === "pendente" && (!c.expira_em || c.expira_em.getTime() > Date.now());
        return {
          numero: Number(r.numero),
          criadoEm: r.criado_em.toISOString(),
          status: r.status,
          total: Number(r.total),
          entrega: r.entrega_tipo === "retirada_loja" ? `Retirada na loja ${LOJAS.find((l) => l.id === r.loja_retirada_id)?.nome ?? ""}`.trim() : "Entrega em casa",
          itens: itens.rows.filter((i) => i.pedido_id === r.id).map((i) => ({ nome: i.nome, tamanho: i.tamanho, quantidade: i.quantidade })),
          pix: c ? { metodo: c.metodo, status: pendente ? "pendente" : c.status === "pendente" ? "expirado" : c.status, link: pendente ? `/pagar/${c.token}` : null } : null,
        };
      }),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
