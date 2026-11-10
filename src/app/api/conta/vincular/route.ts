import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cpfValido, soDigitos } from "@/lib/cpf";
import { mesmoPrimeiroNome } from "@/lib/nome";
import { hashCpf, ipDe } from "@/lib/conta-servidor";
import { falhasRecentes, hashCurto, registrarTentativa } from "@/lib/contas-servidor";
import { COOKIE, criarToken, opcoesCookie, sessaoAtual } from "@/lib/sessao";

const MAX_FALHAS_POR_HORA = 5; // por conta

/**
 * Liga a conta por e-mail ao cadastro da Seleto: CPF + celular precisam ser da MESMA linha do cadastro de clientes.
 * Até existir código por WhatsApp a sessão segue "não verificada": mostra cashback e nível, mas não o histórico de compras.
 * Um CPF só liga a UMA conta (índice único), então um cadastro já ligado não pode ser tomado por outra pessoa.
 */
export async function POST(req: Request) {
  const s = await sessaoAtual();
  if (!s?.contaId) return NextResponse.json({ erro: "Entre na sua conta primeiro." }, { status: 401 });
  if (s.cpfHash) return NextResponse.json({ erro: "Sua conta já está ligada a um cadastro." }, { status: 409 });
  let c: { cpf?: unknown; telefone?: unknown; nome?: unknown };
  try {
    c = await req.json();
  } catch {
    return NextResponse.json({ erro: "Pedido inválido." }, { status: 400 });
  }
  const cpf = soDigitos(String(c.cpf ?? ""));
  const tel = String(c.telefone ?? "").replace(/\D/g, "");
  if (!cpfValido(cpf)) return NextResponse.json({ erro: "CPF inválido. Confira os 11 números." }, { status: 400 });
  if (tel.length < 10 || tel.length > 13) return NextResponse.json({ erro: "Informe o celular com DDD." }, { status: 400 });

  // Nome que a pessoa informou (da tela) ou o do cadastro da conta: precisa existir para conferir.
  const { rows: contaRows } = await db().query<{ nome: string | null }>(`SELECT nome FROM loja.contas WHERE id = $1`, [s.contaId]);
  const nomeInformado = String(c.nome ?? "").trim().slice(0, 80) || contaRows[0]?.nome || "";
  if (nomeInformado.length < 2) return NextResponse.json({ erro: "Informe seu nome, como está no seu cadastro da Seleto." }, { status: 400 });

  const ip = ipDe(req);
  const chave = `vinc:${hashCurto(s.contaId)}`;
  if ((await falhasRecentes(chave, 60)) >= MAX_FALHAS_POR_HORA) return NextResponse.json({ erro: "Muitas tentativas. Tente novamente mais tarde." }, { status: 429 });

  const h = hashCpf(cpf);
  const { rows } = await db().query<{ primeiro_nome: string }>(
    `SELECT primeiro_nome FROM loja.v_cliente_cpf_celular WHERE cpf_hash = $1 AND celular8 = $2 LIMIT 1`,
    [h, tel.slice(-8)],
  );
  if (!rows[0]) {
    await registrarTentativa(chave, ip, false);
    // Não diz qual dos dois dados falhou.
    return NextResponse.json({ erro: "Não encontramos um cadastro com esse CPF e celular. Confira os dados ou fale com a loja." }, { status: 404 });
  }

  // CPF e celular existem, mas o nome não é o dono do cadastro: recusa, sem revelar o nome do cadastro.
  if (!mesmoPrimeiroNome(nomeInformado, rows[0].primeiro_nome)) {
    await registrarTentativa(chave, ip, false);
    return NextResponse.json({ erro: "O nome informado não confere com o cadastro desse CPF e celular. Confira o nome, o CPF e o celular, ou fale com a loja." }, { status: 403 });
  }

  try {
    await db().query(
      `UPDATE loja.contas SET cpf_hash = $1, telefone_final = $2, vinculado_em = now(), nome = $3 WHERE id = $4 AND cpf_hash IS NULL`,
      [h, tel.slice(-4), rows[0].primeiro_nome, s.contaId],
    );
  } catch (e) {
    if ((e as { code?: string }).code === "23505") return NextResponse.json({ erro: "Este CPF já está ligado a outra conta. Fale com a loja para ajudar." }, { status: 409 });
    throw e;
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE, criarToken({ cpfHash: h, nome: s.nome || rows[0].primeiro_nome, verificado: false, contaId: s.contaId, email: s.email }), opcoesCookie);
  return res;
}
