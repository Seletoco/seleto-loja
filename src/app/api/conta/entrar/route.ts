import { NextResponse } from "next/server";
import { bancoLigado, db } from "@/lib/db";
import { cpfValido, soDigitos } from "@/lib/cpf";
import { CODIGO_DEMO, CPF_DEMO, hashCodigo, hashCpf } from "@/lib/conta-servidor";
import { COOKIE, criarToken, opcoesCookie } from "@/lib/sessao";

const MAX_TENTATIVAS = 5;

/** Passo 2: confere o código de 6 dígitos e abre a sessão (cookie assinado, 2 h). */
export async function POST(req: Request) {
  let corpo: { cpf?: string; codigo?: string };
  try {
    corpo = await req.json();
  } catch {
    return NextResponse.json({ erro: "Pedido inválido." }, { status: 400 });
  }
  const cpf = soDigitos(String(corpo.cpf ?? ""));
  const codigo = soDigitos(String(corpo.codigo ?? ""));
  if (!cpfValido(cpf) || codigo.length !== 6) return NextResponse.json({ erro: "Confira o CPF e o código de 6 números." }, { status: 400 });
  const h = hashCpf(cpf);

  let nome = "Cliente";
  if (!bancoLigado()) {
    if (cpf !== CPF_DEMO || codigo !== CODIGO_DEMO) return NextResponse.json({ erro: "Código incorreto. (Demonstração: use 123456.)" }, { status: 401 });
    nome = "Cliente Demonstração";
  } else {
    const banco = db();
    const { rows } = await banco.query<{ id: string; codigo_hash: string; tentativas: number }>(
      `SELECT id::text, codigo_hash, tentativas FROM loja.codigos_acesso
        WHERE cpf_hash = $1 AND usado_em IS NULL AND expira_em > now() ORDER BY criado_em DESC LIMIT 1`, [h]);
    const c = rows[0];
    if (!c) return NextResponse.json({ erro: "Código expirado. Peça um novo." }, { status: 401 });
    if (c.tentativas >= MAX_TENTATIVAS) return NextResponse.json({ erro: "Muitas tentativas. Peça um novo código." }, { status: 429 });
    if (c.codigo_hash !== hashCodigo(h, codigo)) {
      await banco.query(`UPDATE loja.codigos_acesso SET tentativas = tentativas + 1 WHERE id = $1`, [c.id]);
      return NextResponse.json({ erro: "Código incorreto." }, { status: 401 });
    }
    const { rowCount } = await banco.query(`UPDATE loja.codigos_acesso SET usado_em = now() WHERE id = $1 AND usado_em IS NULL`, [c.id]);
    if (!rowCount) return NextResponse.json({ erro: "Código já usado. Peça um novo." }, { status: 401 });
    const cli = await banco.query<{ primeiro_nome: string }>(`SELECT primeiro_nome FROM loja.v_cliente_por_cpf WHERE cpf_hash = $1 LIMIT 1`, [h]);
    nome = cli.rows[0]?.primeiro_nome ?? "Cliente";
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE, criarToken({ cpfHash: h, nome }), opcoesCookie);
  return res;
}
