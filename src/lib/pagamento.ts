/**
 * Formas de pagamento de EXEMPLO. Nada aqui cobra de verdade: o pedido nasce como
 * "aguardando pagamento" e o dono liga o provedor (Pix/cartão) depois.
 * Para ligar um provedor, troque `processar` por uma chamada ao gateway escolhido.
 */
export interface FormaPagamento {
  id: "pix" | "cartao" | "pagar_na_loja";
  rotulo: string;
  descricao: string;
  /** Desconto sobre o subtotal (exemplo — edite à vontade). */
  descontoPct: number;
}

export const FORMAS_PAGAMENTO: FormaPagamento[] = [
  { id: "pix", rotulo: "Pix", descricao: "Pague na hora pelo QR Code (exemplo)", descontoPct: 5 },
  { id: "cartao", rotulo: "Cartão de crédito", descricao: "Em até 6x sem juros (exemplo)", descontoPct: 0 },
  { id: "pagar_na_loja", rotulo: "Pagar na retirada", descricao: "Pague na loja ao retirar o pedido", descontoPct: 0 },
];
