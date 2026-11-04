import { createHash } from "node:crypto";
import { bancoLigado, db } from "@/lib/db";
import { calcularNivel, type DadosConta } from "@/lib/conta-tipos";

export const CPF_DEMO = "52998224725";
export const hashCpf = (cpf: string) => createHash("sha256").update(cpf, "utf8").digest("hex");
export const ipDe = (req: Request) => req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "sem-ip";

const NOMES_LOJAS: Record<number, string> = { 3: "Taquara", 13: "Aerotown", 14: "Américas", 15: "Nova Iguaçu" };

export function dadosDemo(): DadosConta {
  const dia = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);
  return {
    nome: "Cliente Demonstração",
    demo: true,
    comprasOcultas: false, // a demonstração mostra tudo, para ver como fica
    cashbacks: [
      { valor: 46.5, liberaEm: dia(-3), venceEm: dia(27) },
      { valor: 80, liberaEm: dia(4), venceEm: dia(34) },
    ],
    extrato: [
      { ganhou: 46.5, usou: 0, saldo: 46.5, data: dia(-3), venceEm: dia(27) },
      { ganhou: 80, usou: 0, saldo: 80, data: dia(-1), venceEm: dia(34) },
      { ganhou: 30, usou: 30, saldo: 0, data: dia(-70), venceEm: dia(-40) },
    ],
    compras: [
      { id: "d1", data: new Date(Date.now() - 86_400_000).toISOString(), loja: "Taquara", valor: 399.9, cashbackUsado: 0, itens: [{ nome: "Tênis Esportivo", detalhe: "Preto · 40", quantidade: 1 }] },
      { id: "d2", data: new Date(Date.now() - 70 * 86_400_000).toISOString(), loja: "Aerotown", valor: 289.8, cashbackUsado: 30, itens: [{ nome: "Camiseta Dry", detalhe: "Azul · M", quantidade: 2 }] },
      { id: "d3", data: new Date(Date.now() - 120 * 86_400_000).toISOString(), loja: "Américas", valor: 520, cashbackUsado: 0, itens: [{ nome: "Jaqueta Corta-vento", detalhe: "Verde · G", quantidade: 1 }] },
    ],
    nivel: calcularNivel(3, 1209.7),
    preferencias: { avisosCashback: true, avisosPromocoes: true },
    alertas: [{ id: "d1", descricao: "Tênis de corrida", tamanho: "42" }],
  };
}

export async function dadosDoCliente(cpfHash: string, verificado: boolean): Promise<DadosConta | null> {
  if (!bancoLigado()) return dadosDemo();
  const banco = db();
  const [cli, cash, ext, comp, itens, gasto, pref, alr] = await Promise.all([
    banco.query<{ primeiro_nome: string }>(`SELECT primeiro_nome FROM loja.v_cliente_por_cpf WHERE cpf_hash = $1 LIMIT 1`, [cpfHash]),
    banco.query<{ valor: string; libera: string; vence: string }>(
      `SELECT valor, to_char(vale_a_partir_de, 'YYYY-MM-DD') AS libera, to_char(valido_ate, 'YYYY-MM-DD') AS vence
         FROM loja.v_cashback_por_cpf WHERE cpf_hash = $1 AND valido_ate >= (now() AT TIME ZONE 'America/Sao_Paulo')::date
        ORDER BY valido_ate, vale_a_partir_de`, [cpfHash]),
    banco.query<{ ganhou: string; usou: string; saldo: string; data: string; vence: string }>(
      `SELECT ganhou, usou, saldo, to_char(criado_em AT TIME ZONE 'America/Sao_Paulo', 'YYYY-MM-DD') AS data, to_char(valido_ate, 'YYYY-MM-DD') AS vence
         FROM loja.v_extrato_cashback_por_cpf WHERE cpf_hash = $1 ORDER BY criado_em DESC LIMIT 50`, [cpfHash]),
    banco.query<{ id: string; data: string; loja_id: number; valor: string; usado: string }>(
      `SELECT venda_id::text AS id, data_hora AS data, loja_id, valor, cashback_usado AS usado
         FROM loja.v_compras_por_cpf WHERE cpf_hash = $1 ORDER BY data_hora DESC LIMIT 20`, [cpfHash]),
    banco.query<{ id: string; nome: string; marca: string | null; cor: string | null; tamanho: string | null; quantidade: string }>(
      `SELECT i.venda_id::text AS id, i.produto_nome AS nome, i.marca, i.cor, i.tamanho, i.quantidade
         FROM loja.v_compra_itens_por_cpf i
        WHERE i.cpf_hash = $1 AND i.venda_id IN (SELECT venda_id FROM loja.v_compras_por_cpf WHERE cpf_hash = $1 ORDER BY data_hora DESC LIMIT 20)`, [cpfHash]),
    banco.query<{ compras: number; gasto: string }>(`SELECT compras, gasto FROM loja.v_gasto_12m_por_cpf WHERE cpf_hash = $1`, [cpfHash]),
    banco.query<{ avisos_cashback: boolean; avisos_promocoes: boolean }>(`SELECT avisos_cashback, avisos_promocoes FROM loja.preferencias WHERE cpf_hash = $1`, [cpfHash]),
    banco.query<{ id: string; descricao: string; tamanho: string | null }>(`SELECT id::text, descricao, tamanho FROM loja.alertas_produto WHERE cpf_hash = $1 AND ativo ORDER BY criado_em DESC LIMIT 20`, [cpfHash]),
  ]);
  if (cli.rows.length === 0) return null;
  return {
    nome: cli.rows[0].primeiro_nome,
    demo: false,
    comprasOcultas: !verificado,
    cashbacks: cash.rows.map((r) => ({ valor: Number(r.valor), liberaEm: r.libera, venceEm: r.vence })),
    extrato: ext.rows.map((r) => ({ ganhou: Number(r.ganhou), usou: Number(r.usou), saldo: Number(r.saldo), data: r.data, venceEm: r.vence })),
    compras: !verificado ? [] : comp.rows.map((c) => ({
      id: c.id,
      data: new Date(c.data).toISOString(),
      loja: NOMES_LOJAS[c.loja_id] ?? "Seleto",
      valor: Number(c.valor),
      cashbackUsado: Number(c.usado),
      itens: itens.rows.filter((i) => i.id === c.id).map((i) => ({ nome: i.nome, detalhe: [i.cor, i.tamanho].filter(Boolean).join(" · "), quantidade: Number(i.quantidade) })),
    })),
    nivel: calcularNivel(gasto.rows[0]?.compras ?? 0, Number(gasto.rows[0]?.gasto ?? 0)),
    preferencias: { avisosCashback: pref.rows[0]?.avisos_cashback ?? true, avisosPromocoes: pref.rows[0]?.avisos_promocoes ?? true },
    alertas: alr.rows.map((a) => ({ id: a.id, descricao: a.descricao, tamanho: a.tamanho })),
  };
}
