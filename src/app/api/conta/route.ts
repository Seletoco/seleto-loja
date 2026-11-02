import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { bancoLigado, db } from "@/lib/db";
import { cpfValido, soDigitos } from "@/lib/cpf";

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

/** CPF de teste (válido, de exemplo) para o modo demonstração. */
const CPF_DEMO = "52998224725";

const LIMITE_POR_HORA = 10; // consultas por rede (IP): CPF não é segredo, então o freio é contra varredura
const memoria = new Map<string, number[]>(); // só para o modo demonstração

const hashCpf = (cpf: string) => createHash("sha256").update(cpf, "utf8").digest("hex");

/**
 * Consulta de cashback pelo CPF. O servidor nunca recebe o CPF do banco: compara só o hash (sha256) do que o cliente
 * digitou. Devolve apenas o primeiro nome e os valores — nada de telefone, sobrenome ou histórico.
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
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "sem-ip";

  // ---------- modo demonstração (sem banco ligado) ----------
  if (!bancoLigado()) {
    const agora = Date.now();
    const recentes = (memoria.get(ip) ?? []).filter((t) => agora - t < 3_600_000);
    if (recentes.length >= LIMITE_POR_HORA) return NextResponse.json({ erro: "Muitas consultas. Tente novamente mais tarde." }, { status: 429 });
    memoria.set(ip, [...recentes, agora]);
    if (cpf === CPF_DEMO) {
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
    return NextResponse.json({ erro: "Não encontramos este CPF. (Modo demonstração: use 529.982.247-25.)", naoCliente: true }, { status: 404 });
  }

  // ---------- banco ligado ----------
  const h = hashCpf(cpf);
  const banco = db();
  const { rows: tent } = await banco.query<{ n: string }>(
    `SELECT count(*) AS n FROM loja.tentativas_login WHERE ip = $1 AND criado_em > now() - interval '1 hour'`,
    [ip],
  );
  if (Number(tent[0]?.n ?? 0) >= LIMITE_POR_HORA) {
    return NextResponse.json({ erro: "Muitas consultas. Tente novamente mais tarde." }, { status: 429 });
  }
  const { rows: cli } = await banco.query<{ primeiro_nome: string }>(
    `SELECT primeiro_nome FROM loja.v_cliente_por_cpf WHERE cpf_hash = $1 LIMIT 1`,
    [h],
  );
  // Guarda só um pedaço do hash (nunca o CPF) para o freio por rede.
  await banco.query(`INSERT INTO loja.tentativas_login (telefone, ip, ok) VALUES ($1, $2, $3)`, [`cpf:${h.slice(0, 12)}`, ip, cli.length > 0]);
  if (cli.length === 0) {
    return NextResponse.json({ erro: "Não encontramos este CPF na nossa base de clientes.", naoCliente: true }, { status: 404 });
  }

  const { rows } = await banco.query<{ valor: string; libera: string; vence: string }>(
    `SELECT valor, to_char(vale_a_partir_de, 'YYYY-MM-DD') AS libera, to_char(valido_ate, 'YYYY-MM-DD') AS vence
       FROM loja.v_cashback_por_cpf
      WHERE cpf_hash = $1 AND valido_ate >= (now() AT TIME ZONE 'America/Sao_Paulo')::date
      ORDER BY valido_ate, vale_a_partir_de`,
    [h],
  );
  const resposta: RespostaConta = {
    nome: cli[0].primeiro_nome,
    demo: false,
    cashbacks: rows.map((r) => ({ valor: Number(r.valor), liberaEm: r.libera, venceEm: r.vence })),
  };
  return NextResponse.json(resposta);
}
