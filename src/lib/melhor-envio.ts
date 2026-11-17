/**
 * Cotação de frete pelo Melhor Envio (API de cálculo de fretes: POST /api/v2/me/shipment/calculate).
 *
 * LIGA SOZINHO quando as variáveis de ambiente existem (configure na Vercel como Sensitive):
 *   MELHOR_ENVIO_TOKEN   token de acesso do aplicativo/conta (Melhor Envio > Gestão > Integrações > Tokens)
 *   MELHOR_ENVIO_EMAIL   e-mail de contato técnico da loja (o Melhor Envio exige no User-Agent)
 *   (opcionais: MELHOR_ENVIO_AMBIENTE=sandbox para testar; CEP_ORIGEM para trocar o CEP de origem)
 * Sem elas o `/api/frete` usa os Correios (se configurados) ou a estimativa de exemplo, sempre avisando.
 *
 * Usa `custom_price` e `custom_delivery_time` (valores da conta, com as tarifas/descontos da loja), como o manual orienta.
 * Qualquer resposta fora do esperado vira erro: a rota cai na estimativa avisando, nunca mostra preço inventado como real.
 */
import { cepDeOrigem } from "./correios";
import type { Embalagem, OpcaoFrete } from "./frete";

const BASE = { producao: "https://melhorenvio.com.br", sandbox: "https://sandbox.melhorenvio.com.br" } as const;
type Env = Record<string, string | undefined>;

export const melhorEnvioConfigurado = (env: Env = process.env): boolean => Boolean(env.MELHOR_ENVIO_TOKEN && env.MELHOR_ENVIO_EMAIL);

export const ambienteDoMelhorEnvio = (env: Env = process.env): "producao" | "sandbox" => (env.MELHOR_ENVIO_AMBIENTE?.toLowerCase() === "sandbox" ? "sandbox" : "producao");

/** Corpo da cotação: uma encomenda só (já somada por `embalagemDoPedido`). Peso em kg, medidas em cm, valor declarado em reais. */
export function corpoDaCotacao(origem: string, destino: string, emb: Embalagem, valorDeclarado: number) {
  return {
    from: { postal_code: origem },
    to: { postal_code: destino },
    products: [
      {
        id: "pedido",
        width: Math.max(1, Math.ceil(emb.largura)),
        height: Math.max(1, Math.ceil(emb.altura)),
        length: Math.max(1, Math.ceil(emb.comprimento)),
        weight: Math.max(0.1, Math.round(emb.pesoG) / 1000),
        insurance_value: Math.max(0, Math.round(valorDeclarado * 100) / 100),
        quantity: 1,
      },
    ],
  };
}

const numero = (v: unknown): number => {
  if (typeof v === "number") return v;
  const s = String(v ?? "").trim();
  if (!s) return NaN;
  return Number(s.includes(",") ? s.replace(/\./g, "").replace(",", ".") : s);
};

/** Lê a lista de serviços: ignora os que vieram com erro/indisponíveis, ordena pelo menor preço e devolve até `max`. */
export function lerOpcoes(json: unknown, max = 4): OpcaoFrete[] {
  if (!Array.isArray(json)) return [];
  const opcoes: OpcaoFrete[] = [];
  for (const x of json) {
    const s = (x ?? {}) as Record<string, unknown>;
    if (s.error) continue;
    const valor = numero(s.custom_price ?? s.price);
    const dias = Number(s.custom_delivery_time ?? s.delivery_time);
    const empresa = String((s.company as { name?: unknown } | undefined)?.name ?? "").trim();
    const nome = String(s.name ?? "").trim();
    if (!Number.isFinite(valor) || valor <= 0 || !Number.isFinite(dias) || dias <= 0 || !nome || s.id == null) continue;
    opcoes.push({
      servico: `ME${String(s.id).replace(/\W/g, "").slice(0, 8)}`,
      nome: empresa && !nome.toLowerCase().includes(empresa.toLowerCase()) ? `${empresa} ${nome}` : nome,
      valor: Math.round(valor * 100) / 100,
      prazoDias: Math.round(dias),
      exemplo: false,
    });
  }
  return opcoes.sort((a, b) => a.valor - b.valor).slice(0, max);
}

export async function cotarNoMelhorEnvio(cepDestino: string, emb: Embalagem, valorDeclarado: number, env: Env = process.env): Promise<OpcaoFrete[]> {
  const r = await fetch(`${BASE[ambienteDoMelhorEnvio(env)]}/api/v2/me/shipment/calculate`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.MELHOR_ENVIO_TOKEN}`,
      "User-Agent": `Seleto Store (${env.MELHOR_ENVIO_EMAIL})`,
    },
    body: JSON.stringify(corpoDaCotacao(cepDeOrigem(), cepDestino.replace(/\D/g, ""), emb, valorDeclarado)),
    signal: AbortSignal.timeout(12_000),
    cache: "no-store",
  });
  if (r.status === 401 || r.status === 403) throw new Error(`Melhor Envio recusou o token (HTTP ${r.status})`);
  if (!r.ok) throw new Error(`Melhor Envio respondeu HTTP ${r.status}`);
  const opcoes = lerOpcoes(await r.json().catch(() => null));
  if (opcoes.length === 0) throw new Error("Melhor Envio sem serviço disponível para este CEP");
  return opcoes;
}
