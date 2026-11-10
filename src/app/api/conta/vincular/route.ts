import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cpfValido, soDigitos } from "@/lib/cpf";
import { confereIdentidade, nascimentoIso } from "@/lib/identidade";
import { hashCpf, ipDe } from "@/lib/conta-servidor";
import { falhasRecentes, hashCurto, registrarTentativa } from "@/lib/contas-servidor";
import { COOKIE, criarToken, opcoesCookie, sessaoAtual } from "@/lib/sessao";

const MAX_FALHAS_POR_HORA = 5; // por conta

/**
 * Liga a conta por e-mail ao cadastro da Seleto. A pessoa informa CPF, celular, nome completo e data de nascimento, e TUDO
 * precisa bater com o MESMO cadastro. Falha sempre com a mesma mensagem (não revela se o CPF existe nem qual dado errou).
 * Um CPF só liga a UMA conta (índice único), então um cadastro já ligado não pode ser tomado por outra pessoa.
 * Até existir código por WhatsApp a sessão segue "não verificada": o histórico de compras continua oculto.
 */
export async function POST(req: Request) {
  const s = await sessaoAtual();
  if (!s?.contaId) return NextResponse.json({ erro: "Entre na sua conta primeiro." }, { status: 401 });
  if (s.cpfHash) return NextResponse.json({ erro: "Sua conta já está ligada a um cadastro." }, { status: 409 });
  let c: { cpf?: unknown; telefone?: unknown; nome?: unknown; nascimento?: unknown };
  try {
    c = await req.json();
  } catch {
    return NextResponse.json({ erro: "Pedido inválido." }, { status: 400 });
  }
  const cpf = soDigitos(String(c.cpf ?? ""));
  const tel = String(c.telefone ?? "").replace(/\D/g, "");
  const nome = String(c.nome ?? "").trim().slice(0, 120);
  const nascimento = nascimentoIso(c.nascimento);
  if (!cpfValido(cpf)) return NextResponse.json({ erro: "CPF inválido. Confira os 11 números." }, { status: 400 });
  if (tel.length < 10 || tel.length > 13) return NextResponse.json({ erro: "Informe o celular com DDD." }, { status: 400 });
  if (nome.split(/\s+/).filter(Boolean).length < 2) return NextResponse.json({ erro: "Informe seu nome completo, como está no seu cadastro da Seleto." }, { status: 400 });
  if (!nascimento) return NextResponse.json({ erro: "Informe a data de nascimento (dia/mês/ano)." }, { status: 400 });

  const ip = ipDe(req);
  const chave = `vinc:${hashCurto(s.contaId)}`;
  if ((await falhasRecentes(chave, 60)) >= MAX_FALHAS_POR_HORA) return NextResponse.json({ erro: "Muitas tentativas. Tente novamente mais tarde." }, { status: 429 });

  const h = hashCpf(cpf);
  const { rows } = await db().query<{ nome: string; nascimento: string | null }>(
    `SELECT nome, to_char(nascimento, 'YYYY-MM-DD') AS nascimento FROM loja.v_cliente_identidade WHERE cpf_hash = $1 AND celular8 = $2`,
    [h, tel.slice(-8)],
  );
  if (!rows.some((r) => confereIdentidade({ nome, nascimento }, r))) {
    await registrarTentativa(chave, ip, false);
    return NextResponse.json(
      { erro: "Os dados não conferem com o cadastro da Seleto. Confira o CPF, o celular, o nome completo e a data de nascimento. Se o seu cadastro estiver incompleto, fale com a loja." },
      { status: 404 },
    );
  }

  const primeiro = nome.split(/\s+/)[0].slice(0, 40);
  try {
    await db().query(
      `UPDATE loja.contas SET cpf_hash = $1, telefone_final = $2, vinculado_em = now(), nome = $3 WHERE id = $4 AND cpf_hash IS NULL`,
      [h, tel.slice(-4), primeiro, s.contaId],
    );
  } catch (e) {
    if ((e as { code?: string }).code === "23505") return NextResponse.json({ erro: "Este CPF já está ligado a outra conta. Fale com a loja para ajudar." }, { status: 409 });
    throw e;
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE, criarToken({ cpfHash: h, nome: primeiro, verificado: false, contaId: s.contaId, email: s.email }), opcoesCookie);
  return res;
}
