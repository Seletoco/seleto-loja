import { NextResponse } from "next/server";
import { garantirCatalogo, produtoPorRef } from "@/lib/catalogo";
import { cepDeOrigem, correiosConfigurado, cotarNosCorreios } from "@/lib/correios";
import { cepValido, embalagemDoPedido, estimativaDeExemplo, ufDoCep, type OpcaoFrete } from "@/lib/frete";

export interface RespostaFrete {
  cep: string;
  uf: string | null;
  origem: "correios" | "exemplo";
  opcoes: OpcaoFrete[];
  /** Explica por que caiu na estimativa, quando for o caso. */
  aviso?: string;
}

const memoria = new Map<string, number[]>();
const LIMITE_POR_HORA = 60; // protege a cota da API dos Correios

/** Cotação de frete por CEP. Peso e caixa saem da categoria dos produtos, que o SERVIDOR consulta (não confia no cliente). */
export async function POST(req: Request) {
  let corpo: { cep?: string; itens?: { ref?: string; quantidade?: number }[] };
  try {
    corpo = await req.json();
  } catch {
    return NextResponse.json({ erro: "Pedido inválido." }, { status: 400 });
  }
  const cep = String(corpo.cep ?? "").replace(/\D/g, "");
  if (!cepValido(cep)) return NextResponse.json({ erro: "CEP inválido. Confira os 8 números." }, { status: 400 });
  const itensIn = Array.isArray(corpo.itens) ? corpo.itens.slice(0, 50) : [];
  if (itensIn.length === 0) return NextResponse.json({ erro: "A sacola está vazia." }, { status: 400 });

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "sem-ip";
  const agora = Date.now();
  const recentes = (memoria.get(ip) ?? []).filter((t) => agora - t < 3_600_000);
  if (recentes.length >= LIMITE_POR_HORA) return NextResponse.json({ erro: "Muitas consultas de frete. Tente mais tarde." }, { status: 429 });
  memoria.set(ip, [...recentes, agora]);

  await garantirCatalogo();
  const emb = embalagemDoPedido(
    itensIn.map((i) => ({ categoria: produtoPorRef(String(i.ref ?? ""))?.categoria ?? "", quantidade: Math.min(20, Math.max(1, Number(i.quantidade) || 1)) })),
  );
  const uf = ufDoCep(cep);
  if (!uf) return NextResponse.json({ erro: "Não reconhecemos este CEP." }, { status: 400 });

  if (correiosConfigurado()) {
    try {
      const opcoes = await cotarNosCorreios(cep, emb);
      return NextResponse.json({ cep, uf, origem: "correios", opcoes } satisfies RespostaFrete);
    } catch (e) {
      console.error("[frete] Correios indisponível, usando estimativa:", e instanceof Error ? e.message : e);
      return NextResponse.json({
        cep, uf, origem: "exemplo", opcoes: estimativaDeExemplo(uf, emb, ufDoCep(cepDeOrigem()) ?? "RJ"),
        aviso: "Não conseguimos consultar os Correios agora. Valores estimados — a loja confirma o frete antes de cobrar.",
      } satisfies RespostaFrete);
    }
  }
  return NextResponse.json({
    cep, uf, origem: "exemplo", opcoes: estimativaDeExemplo(uf, emb, ufDoCep(cepDeOrigem()) ?? "RJ"),
    aviso: "Valores de exemplo (Correios ainda não configurado). A loja confirma o frete antes de cobrar.",
  } satisfies RespostaFrete);
}
