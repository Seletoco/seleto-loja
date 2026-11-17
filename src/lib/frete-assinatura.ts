/**
 * Cotação de frete ASSINADA. A rota /api/frete devolve, junto de cada opção, uma assinatura (HMAC) do que foi cotado
 * (CEP, itens, serviço, valor, prazo) com validade curta. No pedido, o servidor só confere a assinatura: o navegador não
 * consegue mudar o valor, e o pedido não depende de cotar de novo (a cotação do Melhor Envio varia de uma chamada para outra).
 */
import { createHmac, timingSafeEqual } from "node:crypto";

export interface DadosCotacao {
  cep: string;
  /** Itens agregados por produto, ex.: "004319:2|004653:1". */
  itens: string;
  nome: string;
  valor: number;
  prazoDias: number;
  exemplo: boolean;
  /** Fim da validade (ms). */
  exp: number;
}

export const VALIDADE_DA_COTACAO_MS = 2 * 3_600_000;

const assinar = (segredo: string, corpo: string) => createHmac("sha256", `${segredo}|frete.v1`).update(corpo).digest("base64url");

/** Itens → texto estável: soma por produto (cada linha limitada a 20) e ordena. Igual na cotação e no pedido. */
export function resumoDosItens(itens: { ref?: unknown; quantidade?: unknown }[]): string {
  const soma = new Map<string, number>();
  for (const i of itens) {
    const ref = String(i.ref ?? "").trim();
    const q = Math.min(20, Math.max(1, Math.floor(Number(i.quantidade)) || 1));
    soma.set(ref, (soma.get(ref) ?? 0) + q);
  }
  return [...soma.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([r, q]) => `${r}:${q}`).join("|");
}

export function assinarCotacao(segredo: string, d: DadosCotacao): string {
  const corpo = Buffer.from(JSON.stringify(d), "utf8").toString("base64url");
  return `${corpo}.${assinar(segredo, corpo)}`;
}

/** Lê a cotação se a assinatura confere e ainda vale; senão null. */
export function lerCotacao(segredo: string, token: unknown, agoraMs: number): DadosCotacao | null {
  if (typeof token !== "string" || token.length > 2000) return null;
  const [corpo, sig, resto] = token.split(".");
  if (!corpo || !sig || resto !== undefined) return null;
  const esperado = Buffer.from(assinar(segredo, corpo));
  const recebido = Buffer.from(sig);
  if (esperado.length !== recebido.length || !timingSafeEqual(esperado, recebido)) return null;
  try {
    const d = JSON.parse(Buffer.from(corpo, "base64url").toString("utf8")) as DadosCotacao;
    if (typeof d.cep !== "string" || typeof d.itens !== "string" || typeof d.nome !== "string" || !Number.isFinite(d.valor) || !Number.isFinite(d.prazoDias) || !Number.isFinite(d.exp)) return null;
    return d.exp > agoraMs ? d : null;
  } catch {
    return null;
  }
}
