/** Conferência do frete do pedido contra a cotação do servidor (função pura, testável sem rede nem catálogo). */
import type { OpcaoFrete } from "./frete";
import { reais } from "./format";
import type { PedidoValidado } from "./pedido-servidor";

const arred = (n: number) => Math.round(n * 100) / 100;

/**
 * Compara o frete que o navegador mandou com o que o servidor cotou agora, para o MESMO serviço (pelo nome).
 * Se bater (até 1 centavo), o pedido segue com o valor, o prazo e o aviso de estimativa do servidor; se não bater, recusa.
 */
export function aplicarFreteCotado(p: PedidoValidado, opcoes: OpcaoFrete[]): { erro: string } | { pedido: PedidoValidado } {
  const escolhida = opcoes.find((o) => o.nome.trim().toLowerCase() === (p.entrega.servico ?? "").trim().toLowerCase());
  if (!escolhida) return { erro: "Não foi possível confirmar a forma de envio escolhida. Calcule o frete de novo e escolha outra vez." };
  if (Math.abs(escolhida.valor - p.frete) > 0.01) {
    return { erro: `O frete de ${escolhida.nome} está em ${reais(escolhida.valor)}, e não ${reais(p.frete)}. Atualize o frete e confirme de novo.` };
  }
  const frete = arred(escolhida.valor);
  return {
    pedido: {
      ...p,
      frete,
      total: arred(p.subtotal + frete - p.cashbackUsado),
      entrega: { ...p.entrega, prazoDias: escolhida.prazoDias, freteEstimado: escolhida.exemplo },
    },
  };
}
