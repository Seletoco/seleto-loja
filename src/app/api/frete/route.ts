import { NextResponse } from "next/server";
import { cotarFrete, type RespostaFrete } from "@/lib/frete-servidor";

export type { RespostaFrete };

const memoria = new Map<string, number[]>();
const LIMITE_POR_HORA = 60; // protege a cota da API de frete

/** Cotação de frete por CEP. Peso e caixa saem da categoria dos produtos, que o SERVIDOR consulta (não confia no cliente). */
export async function POST(req: Request) {
  let corpo: { cep?: string; itens?: { ref?: string; quantidade?: number }[] };
  try {
    corpo = await req.json();
  } catch {
    return NextResponse.json({ erro: "Pedido inválido." }, { status: 400 });
  }
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "sem-ip";
  const agora = Date.now();
  const recentes = (memoria.get(ip) ?? []).filter((t) => agora - t < 3_600_000);
  if (recentes.length >= LIMITE_POR_HORA) return NextResponse.json({ erro: "Muitas consultas de frete. Tente mais tarde." }, { status: 429 });
  memoria.set(ip, [...recentes, agora]);

  const r = await cotarFrete(String(corpo.cep ?? ""), Array.isArray(corpo.itens) ? corpo.itens : []);
  return r.ok ? NextResponse.json(r.resposta satisfies RespostaFrete) : NextResponse.json({ erro: r.erro }, { status: r.status });
}
