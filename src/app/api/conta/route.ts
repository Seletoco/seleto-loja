import { NextResponse } from "next/server";
import { bancoLigado, db } from "@/lib/db";


interface Cashback {
  valor: number;
  liberaEm: string; // AAAA-MM-DD
  venceEm: string;
}
export interface RespostaConta {
  nome: string;
  demo: boolean;
  cashbacks: Cashback[];
}

const LIMITE_TENTATIVAS = 5; // por celular, por hora
const memoria = new Map<string, number[]>(); // só para o modo demonstração

function soDigitos(s: unknown) {
  return String(s ?? "").replace(/\D/g, "");
}

export async function POST(req: Request) {
  let corpo: { telefone?: string; cpf?: string };
  try {
    corpo = await req.json();
  } catch {
    return NextResponse.json({ erro: "Pedido inválido." }, { status: 400 });
  }
  const telefone = soDigitos(corpo.telefone).slice(-11);
  const cpf3 = soDigitos(corpo.cpf).slice(0, 3);
  if (telefone.length < 10 || cpf3.length !== 3) {
    return NextResponse.json({ erro: "Informe o celular com DDD e os 3 primeiros dígitos do CPF." }, { status: 400 });
  }
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "";

  // ---------- modo demonstração (sem banco ligado) ----------
  if (!bancoLigado()) {
    const agora = Date.now();
    const recentes = (memoria.get(telefone) ?? []).filter((t) => agora - t < 3_600_000);
    if (recentes.length >= LIMITE_TENTATIVAS) return NextResponse.json({ erro: "Muitas tentativas. Tente novamente mais tarde." }, { status: 429 });
    memoria.set(telefone, [...recentes, agora]);
    if (telefone === "21999999999" && cpf3 === "123") {
      const dia = (n: number) => new Date(agora + n * 86_400_000).toISOString().slice(0, 10);
      const demo: RespostaConta = {
        nome: "Cliente Demonstração",
        demo: true,
        cashbacks: [
          { valor: 46.5, liberaEm: dia(-3), venceEm: dia(27) },
          { valor: 80, liberaEm: dia(4), venceEm: dia(34) },
        ],
      };
      return NextResponse.json(demo);
    }
    return NextResponse.json({ erro: "Dados não conferem. (Modo demonstração: use 21 99999-9999 e 123.)" }, { status: 401 });
  }

  // ---------- banco ligado ----------
  const banco = db();
  const { rows: tent } = await banco.query<{ n: string }>(
    `SELECT count(*) AS n FROM loja.tentativas_login WHERE telefone = $1 AND criado_em > now() - interval '1 hour'`,
    [telefone],
  );
  if (Number(tent[0]?.n ?? 0) >= LIMITE_TENTATIVAS) {
    return NextResponse.json({ erro: "Muitas tentativas. Tente novamente mais tarde." }, { status: 429 });
  }
  const { rows: cli } = await banco.query<{ primeiro_nome: string }>(
    `SELECT primeiro_nome FROM loja.v_cliente_verificacao WHERE telefone = $1 AND cpf_inicio3 = $2 LIMIT 1`,
    [telefone, cpf3],
  );
  await banco.query(`INSERT INTO loja.tentativas_login (telefone, ip, ok) VALUES ($1, $2, $3)`, [telefone, ip, cli.length > 0]);
  if (cli.length === 0) return NextResponse.json({ erro: "Dados não conferem." }, { status: 401 });

  const { rows } = await banco.query<{ valor: string; libera: string; vence: string }>(
    `SELECT valor, to_char(vale_a_partir_de, 'YYYY-MM-DD') AS libera, to_char(valido_ate, 'YYYY-MM-DD') AS vence
       FROM loja.v_cashback
      WHERE telefone = $1 AND valido_ate >= (now() AT TIME ZONE 'America/Sao_Paulo')::date
      ORDER BY valido_ate, vale_a_partir_de`,
    [telefone],
  );
  const resposta: RespostaConta = {
    nome: cli[0].primeiro_nome,
    demo: false,
    cashbacks: rows.map((r) => ({ valor: Number(r.valor), liberaEm: r.libera, venceEm: r.vence })),
  };
  return NextResponse.json(resposta);
}
