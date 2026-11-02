export interface Produto {
  ref: string;
  nome: string;
  marca: string;
  categoria: string;
  cor: string;
  tamanhos: string[];
  preco: number;
  precoDe: number | null;
  foto: string | null;
  novo: boolean;
}

export interface ItemCarrinho {
  ref: string;
  nome: string;
  cor: string;
  tamanho: string;
  preco: number;
  foto: string | null;
  quantidade: number;
}

export interface PedidoSalvo {
  numero: number;
  criadoEm: string;
  itens: ItemCarrinho[];
  cliente: { nome: string; telefone: string; email: string };
  entrega: { tipo: "retirada_loja" | "entrega_combinada"; loja?: string; endereco?: string; servico?: string; prazoDias?: number; freteExemplo?: boolean };
  pagamento: { metodo: string; rotulo: string };
  subtotal: number;
  /** Cashback abatido neste pedido (a loja confirma e dá baixa). */
  cashback?: { usado: number; telefone: string };
  frete: number;
  total: number;
  status: string;
}
