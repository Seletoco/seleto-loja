import { NextResponse } from "next/server";
import { bancoLigado, db } from "@/lib/db";
import { cpfValido, soDigitos } from "@/lib/cpf";
import { CPF_DEMO, hashCpf, ipDe } from "@/lib/conta-servidor";
import { COOKIE, criarToken, opcoesCookie } from "@/lib/sessao";

const LIMITE_POR_HORA = 10; // consultas por rede (IP): o CPF não é segredo, então o freio é contra varredura
const memoria = new Map<string, number[]>(); // só no modo demonstração

/**
 * Entrada na área do cliente só pelo CPF (a verificação por código no WhatsApp ainda não existe). Como o CPF não é segredo,
 * a sessão sai marcada como NÃO verificada: mostra cashback e nível, mas nunca o histórico de compras.
 */
export async function POST(req: Request) {
  let corpo: { cpf?: string };
  try {
    corpo = await req.json();
  } catch {
    return NextResponse.json({ erro: "Pedido inválido." }, { status: 400 });
  }
  const cpf = soDigitos(String(corpo.cpf ?? ""));
  if (!cpfValido(cpf)) return NextResponse.json({ erro: "CPF inválido. Confira os 11 números." }, { status: 400 });
  const ip = ipDe(req);
  const h = hashCpf(cpf);
  let nome: string;

  if (!bancoLigado()) {
    const agora = Date.now();
    const recentes = (memoria.get(ip) ?? []).filter((t) => agora - t < 3_600_000);
    if (recentes.length >= LIMITE_POR_HORA) return NextResponse.json({ erro: "Muitas consultas. Tente novamente mais tarde." }, { status: 429 });
    memoria.set(ip, [...recentes, agora]);
    if (cpf !== CPF_DEMO) return NextResponse.json({ erro: "Não encontramos este CPF. (Modo demonstração: use 529.982.247-25.)" }, { status: 404 });
    nome = "Cliente Demonstração";
  } else {
    const banco = db();
    const { rows: tent } = await banco.query<{ n: string }>(`SELECT count(*) AS n FROM loja.tentativas_login WHERE ip = $1 AND criado_em > now() - interval '1 hour'`, [ip]);
    if (Number(tent[0]?.n ?? 0) >= LIMITE_POR_HORA) return NextResponse.json({ erro: "Muitas consultas. Tente novamente mais tarde." }, { status: 429 });
    const { rows: cli } = await banco.query<{ primeiro_nome: string }>(`SELECT primeiro_nome FROM loja.v_cliente_por_cpf WHERE cpf_hash = $1 LIMIT 1`, [h]);
    // Guarda só um pedaço do hash (nunca o CPF) para o freio por rede.
    await banco.query(`INSERT INTO loja.tentativas_login (telefone, ip, ok) VALUES ($1, $2, $3)`, [`cpf:${h.slice(0, 12)}`, ip, cli.length > 0]);
    if (cli.length === 0) return NextResponse.json({ erro: "Não encontramos este CPF na nossa base de clientes." }, { status: 404 });
    nome = cli[0].primeiro_nome;
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE, criarToken({ cpfHash: h, nome, verificado: false }), opcoesCookie);
  return res;
}
