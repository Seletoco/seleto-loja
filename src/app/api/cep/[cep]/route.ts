import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const memoria = new Map<string, number[]>();
const LIMITE_POR_HORA = 120;

/**
 * Endereço pelo CEP (ViaCEP), consultado pelo SERVIDOR: o navegador não pode chamar o ViaCEP direto porque a política de
 * segurança do site (CSP) só permite o próprio site. Devolve só os campos que o checkout usa.
 */
export async function GET(req: Request, { params }: { params: Promise<{ cep: string }> }) {
  const { cep } = await params;
  const d = cep.replace(/\D/g, "");
  if (!/^\d{8}$/.test(d)) return NextResponse.json({ erro: "CEP inválido." }, { status: 400 });

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "sem-ip";
  const agora = Date.now();
  const recentes = (memoria.get(ip) ?? []).filter((t) => agora - t < 3_600_000);
  if (recentes.length >= LIMITE_POR_HORA) return NextResponse.json({ erro: "Muitas consultas. Tente mais tarde." }, { status: 429 });
  memoria.set(ip, [...recentes, agora]);

  try {
    const r = await fetch(`https://viacep.com.br/ws/${d}/json/`, { signal: AbortSignal.timeout(6000), next: { revalidate: 86_400 } });
    if (!r.ok) return NextResponse.json({ erro: "Não foi possível consultar o CEP agora." }, { status: 502 });
    const j = (await r.json()) as { erro?: unknown; logradouro?: string; bairro?: string; localidade?: string; uf?: string };
    if (j.erro) return NextResponse.json({ erro: "CEP não encontrado." }, { status: 404 });
    const t = (v: unknown, n: number) => String(v ?? "").slice(0, n);
    return NextResponse.json(
      { logradouro: t(j.logradouro, 120), bairro: t(j.bairro, 80), cidade: t(j.localidade, 80), uf: t(j.uf, 2).toUpperCase() },
      { headers: { "Cache-Control": "public, max-age=86400" } },
    );
  } catch {
    return NextResponse.json({ erro: "Não foi possível consultar o CEP agora." }, { status: 502 });
  }
}
