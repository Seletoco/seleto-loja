import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cpfValido, soDigitos } from "@/lib/cpf";
import { hashCpf, ipDe } from "@/lib/conta-servidor";
import { falhasRecentes, hashCurto, registrarTentativa } from "@/lib/contas-servidor";
import { nomeBonito } from "@/lib/nome";
import { sessaoAtual } from "@/lib/sessao";

const MAX_POR_HORA_CONTA = 8;
const MAX_POR_HORA_IP = 20;

/**
 * Ajuda no passo de ligar a conta: dado o CPF, devolve SÓ o primeiro nome do cadastro da Seleto (nada de sobrenome, nascimento ou telefone).
 * Só para quem está logado e ainda não ligou a conta; cada consulta conta no freio por hora (conta e IP), para ninguém varrer CPFs.
 * A resposta tem sempre o mesmo formato (com ou sem cadastro). A ligação em si continua exigindo todos os dados.
 */
export async function POST(req: Request) {
  const s = await sessaoAtual();
  if (!s?.contaId) return NextResponse.json({ erro: "Entre na sua conta primeiro." }, { status: 401 });
  if (s.cpfHash) return NextResponse.json({ erro: "Sua conta já está ligada a um cadastro." }, { status: 409 });
  let c: { cpf?: unknown };
  try {
    c = await req.json();
  } catch {
    return NextResponse.json({ erro: "Pedido inválido." }, { status: 400 });
  }
  const cpf = soDigitos(String(c.cpf ?? ""));
  if (!cpfValido(cpf)) return NextResponse.json({ erro: "CPF inválido. Confira os 11 números." }, { status: 400 });

  const ip = ipDe(req);
  const chaveConta = `cpfnome:${hashCurto(s.contaId)}`;
  const chaveIp = `cpfnomeip:${hashCurto(ip)}`;
  if ((await falhasRecentes(chaveConta, 60)) >= MAX_POR_HORA_CONTA || (await falhasRecentes(chaveIp, 60)) >= MAX_POR_HORA_IP) {
    return NextResponse.json({ erro: "Muitas consultas. Tente novamente mais tarde." }, { status: 429 });
  }
  // toda consulta conta (ok=false é o que o freio soma)
  await registrarTentativa(chaveConta, ip, false);
  await registrarTentativa(chaveIp, ip, false);

  const { rows } = await db().query<{ nome: string }>(`SELECT nome FROM loja.v_cliente_identidade WHERE cpf_hash = $1 LIMIT 1`, [hashCpf(cpf)]);
  const primeiro = rows[0]?.nome?.trim().split(/\s+/)[0]?.slice(0, 40) ?? "";
  return NextResponse.json({ primeiroNome: primeiro ? nomeBonito(primeiro) : null });
}
