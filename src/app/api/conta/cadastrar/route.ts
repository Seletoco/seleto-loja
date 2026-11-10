import { NextResponse } from "next/server";
import { bancoLigado, db } from "@/lib/db";
import { emailValido, erroDeSenha, hashSenha } from "@/lib/senha";
import { falhasRecentes, hashCurto, primeiroNome, registrarTentativa } from "@/lib/contas-servidor";
import { ipDe } from "@/lib/conta-servidor";
import { COOKIE, criarToken, opcoesCookie } from "@/lib/sessao";

const MAX_CADASTROS_POR_HORA = 5; // por rede

/** Cria a conta (e-mail + senha). A senha é guardada só como hash. Ligar ao cadastro da Seleto é outro passo (/api/conta/vincular). */
export async function POST(req: Request) {
  if (!bancoLigado()) return NextResponse.json({ erro: "O cadastro por e-mail fica disponível quando a loja estiver ligada ao banco." }, { status: 503 });
  let c: { email?: unknown; senha?: unknown; nome?: unknown };
  try {
    c = await req.json();
  } catch {
    return NextResponse.json({ erro: "Pedido inválido." }, { status: 400 });
  }
  const email = String(c.email ?? "").trim().toLowerCase();
  const senha = String(c.senha ?? "");
  const nome = primeiroNome(String(c.nome ?? ""));
  if (nome.length < 2) return NextResponse.json({ erro: "Informe seu nome, como está no seu cadastro da Seleto." }, { status: 400 });
  if (!emailValido(email)) return NextResponse.json({ erro: "Informe um e-mail válido." }, { status: 400 });
  const erroSenha = erroDeSenha(senha);
  if (erroSenha) return NextResponse.json({ erro: erroSenha }, { status: 400 });

  const ip = ipDe(req);
  const chave = `cadastro:${hashCurto(ip)}`;
  if ((await falhasRecentes(chave, 60)) >= MAX_CADASTROS_POR_HORA) return NextResponse.json({ erro: "Muitas tentativas. Tente novamente mais tarde." }, { status: 429 });
  await registrarTentativa(chave, ip, false); // conta cada cadastro; o freio é por hora

  const { rows } = await db().query<{ id: string }>(
    `INSERT INTO loja.contas (email, senha_hash, nome) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING RETURNING id::text`,
    [email, hashSenha(senha), nome || null],
  );
  // Mensagem igual para "já existe" e para erros: não revela quais e-mails têm conta.
  if (!rows[0]) return NextResponse.json({ erro: "Não foi possível criar a conta com esses dados. Se você já tem conta, entre com sua senha." }, { status: 409 });

  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE, criarToken({ cpfHash: "", nome: nome || email.split("@")[0], verificado: false, contaId: rows[0].id, email }), opcoesCookie);
  return res;
}
