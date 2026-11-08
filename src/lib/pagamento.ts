/**
 * Pagamento ABERTO por enquanto: a loja não cobra online. Pix e cartão foram retirados até
 * ligar um provedor. Quem retira paga no balcão; quem recebe em casa combina o pagamento
 * com a loja pelo WhatsApp antes do envio. O pedido nasce "aguardando".
 * Para ligar um provedor depois, inclua uma forma nova aqui e troque o fluxo no checkout.
 */
export interface FormaPagamento {
  id: "pagar_na_loja" | "combinar_whatsapp";
  rotulo: string;
  descricao: string;
  /** Tipo de entrega em que esta forma vale. */
  para: "retirada_loja" | "entrega_combinada";
  /** Desconto sobre o subtotal. Nenhum por enquanto. */
  descontoPct: number;
}

export const FORMAS_PAGAMENTO: FormaPagamento[] = [
  { id: "pagar_na_loja", rotulo: "Pagar na retirada", descricao: "Você paga na loja, ao retirar o pedido.", para: "retirada_loja", descontoPct: 0 },
  { id: "combinar_whatsapp", rotulo: "Combinar pelo WhatsApp", descricao: "A loja chama você no WhatsApp para combinar o pagamento antes de enviar.", para: "entrega_combinada", descontoPct: 0 },
];

export const formaDaEntrega = (entrega: FormaPagamento["para"]): FormaPagamento => FORMAS_PAGAMENTO.find((f) => f.para === entrega)!;
