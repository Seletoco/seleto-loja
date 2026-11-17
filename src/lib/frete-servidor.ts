/**
 * Cotação de frete no SERVIDOR, usada pela rota /api/frete e pela conferência do pedido: o valor cobrado do frete
 * nunca vem do navegador (o servidor cota de novo e recusa qualquer diferença).
 */
import { garantirCatalogo, produtoPorRef } from "./catalogo";
import { cepDeOrigem, correiosConfigurado, cotarNosCorreios } from "./correios";
import { cepValido, embalagemDoPedido, estimativaDeExemplo, ufDoCep, type OpcaoFrete } from "./frete";
import { cotarNoMelhorEnvio, melhorEnvioConfigurado } from "./melhor-envio";
import type { PedidoValidado } from "./pedido-servidor";
import { aplicarFreteAssinado } from "./frete-conferencia";
import { assinarCotacao, lerCotacao, resumoDosItens, VALIDADE_DA_COTACAO_MS } from "./frete-assinatura";
import { bancoLigado } from "./db";

export interface RespostaFrete {
  cep: string;
  uf: string | null;
  origem: "melhorenvio" | "correios" | "exemplo";
  opcoes: OpcaoFrete[];
  /** Explica por que caiu na estimativa, quando for o caso. */
  aviso?: string;
}

export type ResultadoCotacao = { ok: true; resposta: RespostaFrete } | { ok: false; erro: string; status: number };

const qtd = (v: unknown) => Math.min(20, Math.max(1, Number(v) || 1));

function segredoDoFrete(): string {
  const s = process.env.LOJA_SESSAO_SECRET;
  if (s && s.length >= 16) return s;
  if (!bancoLigado()) return "somente-demonstracao-sem-banco";
  throw new Error("LOJA_SESSAO_SECRET não configurada");
}

/** Cota o frete para um CEP e os itens (peso e caixa saem da categoria dos produtos, que o servidor consulta). */
async function cotarSemAssinar(cepBruto: string, itens: { ref?: unknown; quantidade?: unknown }[]): Promise<ResultadoCotacao> {
  const cep = String(cepBruto ?? "").replace(/\D/g, "");
  if (!cepValido(cep)) return { ok: false, erro: "CEP inválido. Confira os 8 números.", status: 400 };
  const lista = Array.isArray(itens) ? itens.slice(0, 50) : [];
  if (lista.length === 0) return { ok: false, erro: "A sacola está vazia.", status: 400 };

  await garantirCatalogo();
  const emb = embalagemDoPedido(lista.map((i) => ({ categoria: produtoPorRef(String(i.ref ?? ""))?.categoria ?? "", quantidade: qtd(i.quantidade) })));
  const uf = ufDoCep(cep);
  if (!uf) return { ok: false, erro: "Não reconhecemos este CEP.", status: 400 };
  const exemplo = (aviso: string): ResultadoCotacao => ({ ok: true, resposta: { cep, uf, origem: "exemplo", opcoes: estimativaDeExemplo(uf, emb, ufDoCep(cepDeOrigem()) ?? "RJ"), aviso } });

  if (melhorEnvioConfigurado()) {
    // Valor declarado = preço do catálogo (o servidor consulta; não confia no cliente).
    const declarado = lista.reduce((s, i) => s + (produtoPorRef(String(i.ref ?? ""))?.preco ?? 0) * qtd(i.quantidade), 0);
    try {
      return { ok: true, resposta: { cep, uf, origem: "melhorenvio", opcoes: await cotarNoMelhorEnvio(cep, emb, declarado) } };
    } catch (e) {
      console.error("[frete] Melhor Envio indisponível:", e instanceof Error ? e.message : e);
      if (!correiosConfigurado()) return exemplo("Não conseguimos consultar o frete agora. Valores estimados — a loja confirma o frete antes de cobrar.");
    }
  }
  if (correiosConfigurado()) {
    try {
      return { ok: true, resposta: { cep, uf, origem: "correios", opcoes: await cotarNosCorreios(cep, emb) } };
    } catch (e) {
      console.error("[frete] Correios indisponível, usando estimativa:", e instanceof Error ? e.message : e);
      return exemplo("Não conseguimos consultar os Correios agora. Valores estimados — a loja confirma o frete antes de cobrar.");
    }
  }
  return exemplo("Valores de exemplo (frete real ainda não configurado). A loja confirma o frete antes de cobrar.");
}

/** Cota e ASSINA cada opção (CEP, itens, serviço, valor, prazo), com validade de 2 horas. */
export async function cotarFrete(cepBruto: string, itens: { ref?: unknown; quantidade?: unknown }[]): Promise<ResultadoCotacao> {
  const r = await cotarSemAssinar(cepBruto, itens);
  if (!r.ok) return r;
  const segredo = segredoDoFrete();
  const resumo = resumoDosItens(Array.isArray(itens) ? itens.slice(0, 50) : []);
  const exp = Date.now() + VALIDADE_DA_COTACAO_MS;
  return {
    ok: true,
    resposta: {
      ...r.resposta,
      opcoes: r.resposta.opcoes.map((o) => ({ ...o, assinatura: assinarCotacao(segredo, { cep: r.resposta.cep, itens: resumo, nome: o.nome, valor: o.valor, prazoDias: o.prazoDias, exemplo: o.exemplo, exp }) })),
    },
  };
}

/** Confere o frete de um pedido de entrega pela assinatura da cotação (sem cotar de novo). Retirada passa direto. */
export function conferirFreteDoPedido(p: PedidoValidado, assinatura: unknown): { erro: string } | { pedido: PedidoValidado } {
  if (p.entrega.tipo !== "entrega_combinada") return { pedido: p };
  return aplicarFreteAssinado(p, lerCotacao(segredoDoFrete(), assinatura, Date.now()));
}
