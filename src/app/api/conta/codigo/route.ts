import { NextResponse } from "next/server";
import { bancoLigado, db } from "@/lib/db";
import { cpfValido, soDigitos } from "@/lib/cpf";
import { CPF_DEMO, hashCpf, ipDe } from "@/lib/conta-servidor";

const LIMITE_POR_HORA = 10; // pedidos por rede (IP)
const memoria = new Map<string, number[]>(); // só no modo demonstração

/** Passo 1: pede o código. O SeleChat (dono do número do cashback) gera e envia o código pelo WhatsApp. */
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

  if (!bancoLigado()) {
    const agora = Date.now();
    const recentes = (memoria.get(ip) ?? []).filter((t) => agora - t < 3_600_000);
    if (recentes.length >= LIMITE_POR_HORA) return NextResponse.json({ erro: "Muitos pedidos. Tente novamente mais tarde." }, { status: 429 });
    memoria.set(ip, [...recentes, agora]);
    if (cpf !== CPF_DEMO) return NextResponse.json({ erro: "Não encontramos este CPF. (Modo demonstração: use 529.982.247-25.)" }, { status: 404 });
    return NextResponse.json({ telefone: "(21) 9****-0000", demo: true });
  }

  const h = hashCpf(cpf);
  const banco = db();
  const { rows: tent } = await banco.query<{ n: string }>(`SELECT count(*) AS n FROM loja.tentativas_login WHERE ip = $1 AND criado_em > now() - interval '1 hour'`, [ip]);
  if (Number(tent[0]?.n ?? 0) >= LIMITE_POR_HORA) return NextResponse.json({ erro: "Muitos pedidos. Tente novamente mais tarde." }, { status: 429 });
  const { rows: cli } = await banco.query(`SELECT 1 FROM loja.v_cliente_por_cpf WHERE cpf_hash = $1 LIMIT 1`, [h]);
  await banco.query(`INSERT INTO loja.tentativas_login (telefone, ip, ok) VALUES ($1, $2, $3)`, [`cpf:${h.slice(0, 12)}`, ip, cli.length > 0]);
  // Mesma resposta para CPF desconhecido e desconhecido-sem-celular: não revela quem é cliente.
  if (cli.length === 0) return NextResponse.json({ erro: "Não encontramos este CPF na nossa base de clientes." }, { status: 404 });

  const url = process.env.SELECHAT_URL;
  const chave = process.env.LOJA_SERVICO_KEY;
  if (!url || !chave) return NextResponse.json({ erro: "Serviço de código indisponível no momento." }, { status: 503 });
  try {
    const r = await fetch(`${url.replace(/\/$/, "")}/api/loja/codigo`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-loja-key": chave },
      body: JSON.stringify({ cpfHash: h }),
      signal: AbortSignal.timeout(20_000),
    });
    const j = (await r.json().catch(() => ({}))) as { telefone?: string; erro?: string };
    if (!r.ok) return NextResponse.json({ erro: j.erro ?? "Não foi possível enviar o código." }, { status: r.status === 429 ? 429 : 502 });
    return NextResponse.json({ telefone: j.telefone ?? "" });
  } catch {
    return NextResponse.json({ erro: "Não foi possível enviar o código agora. Tente em instantes." }, { status: 502 });
  }
}
