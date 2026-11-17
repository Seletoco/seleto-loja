/** Conferência do frete do pedido contra a cotação assinada (função pura, testável sem rede nem catálogo). */
import { resumoDosItens, type DadosCotacao } from "./frete-assinatura";
import type { PedidoValidado } from "./pedido-servidor";

const arred = (n: number) => Math.round(n * 100) / 100;
const REFAZER = "O cálculo do frete expirou ou não confere. Calcule o frete de novo e escolha o envio outra vez.";

/**
 * O frete enviado só vale se for exatamente o que o servidor cotou e assinou: mesmo CEP, mesmos itens, mesmo serviço e mesmo valor.
 * Bateu → o pedido segue com valor, prazo e aviso de estimativa do servidor e o total recalculado; senão recusa.
 */
export function aplicarFreteAssinado(p: PedidoValidado, d: DadosCotacao | null): { erro: string } | { pedido: PedidoValidado } {
  if (!d) return { erro: REFAZER };
  const cep = p.entrega.enderecoDet?.cep ?? "";
  const mesmoServico = d.nome.trim().toLowerCase() === (p.entrega.servico ?? "").trim().toLowerCase();
  if (d.cep !== cep || d.itens !== resumoDosItens(p.itens) || !mesmoServico || Math.abs(d.valor - p.frete) > 0.01) return { erro: REFAZER };
  const frete = arred(d.valor);
  return {
    pedido: {
      ...p,
      frete,
      total: arred(p.subtotal + frete - p.cashbackUsado),
      entrega: { ...p.entrega, prazoDias: d.prazoDias, freteEstimado: d.exemplo },
    },
  };
}
