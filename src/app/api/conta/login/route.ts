import { NextResponse } from "next/server";
import { bancoLigado, db } from "@/lib/db";
import { HASH_FALSO, emailValido, senhaConfere } from "@/lib/senha";
import { falhasRecentes, hashCurto, registrarTentativa } from "@/lib/contas-servidor";
import { ipDe } from "@/lib/conta-servidor";
import { COOKIE, criarToken, opcoesCookie } from "@/lib/sessao";

const MAX_FALHAS_EMAIL = 5; // em 15 minutos, por e-mail
const MAX_FALHAS_IP = 20; // em 15 minutos, por rede

/** Entrada por e-mail e senha. Erro sempre genérico, e o tempo de resposta é parecido exista a conta ou não. */
export async function POST(req: Request) {
  if (!bancoLigado()) return NextResponse.json({ erro: "O login por e-mail fica disponível quando a loja estiver ligada ao banco." }, { status: 503 });
  let c: { email?: unknown; senha?: unknown };
  try {
    c = await req.json();
  } catch {
    return NextResponse.json({ erro: "Pedido inválido." }, { status: 400 });
  }
  const email = String(c.email ?? "").trim().toLowerCase();
  const senha = String(c.senha ?? "");
  const generico = NextResponse.json({ erro: "E-mail ou senha incorretos." }, { status: 401 });
  if (!emailValido(email) || senha.length === 0 || senha.length > 100) return generico;

  const ip = ipDe(req);
  const chaveEmail = `email:${hashCurto(email)}`;
  const chaveIp = `login-ip:${hashCurto(ip)}`;
  if ((await falhasRecentes(chaveEmail, 15)) >= MAX_FALHAS_EMAIL || (await falhasRecentes(chaveIp, 15)) >= MAX_FALHAS_IP) {
    return NextResponse.json({ erro: "Muitas tentativas. Tente novamente em alguns minutos." }, { status: 429 });
  }

  const { rows } = await db().query<{ id: string; senha_hash: string; nome: string | null; cpf_hash: string | null; verificado: boolean }>(
    `SELECT id::text, senha_hash, nome, cpf_hash, verificado FROM loja.contas WHERE lower(email) = $1 LIMIT 1`,
    [email],
  );
  const conta = rows[0];
  const ok = senhaConfere(senha, conta?.senha_hash ?? HASH_FALSO) && Boolean(conta);
  if (!ok) {
    await Promise.all([registrarTentativa(chaveEmail, ip, false), registrarTentativa(chaveIp, ip, false)]);
    return generico;
  }
  await db().query(`UPDATE loja.contas SET ultimo_login = now() WHERE id = $1`, [conta.id]);
  const res = NextResponse.json({ ok: true, vinculada: Boolean(conta.cpf_hash) });
  res.cookies.set(
    COOKIE,
    criarToken({ cpfHash: conta.cpf_hash ?? "", nome: conta.nome || email.split("@")[0], verificado: conta.verificado, contaId: conta.id, email }),
    opcoesCookie,
  );
  return res;
}
