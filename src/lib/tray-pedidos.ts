/**
 * Pedido do site no formato da API Tray (o PDVNet lê assim). Funções puras: sem banco, testáveis.
 * Valores numéricos vão como texto ("59.99"), como a Tray faz. O CPF só sai por aqui, para o PDVNet autenticado.
 */
import { LOJAS } from "./lojas";
import { STATUS_DE_CAPTURA } from "./tray-captura";

export interface LinhaPedido {
  numero: string;
  criado_em: Date;
  atualizado_em: Date;
  status: string;
  cliente_nome: string;
  cliente_telefone: string;
  cliente_email: string | null;
  cliente_cpf: string | null;
  entrega_tipo: "retirada_loja" | "entrega_combinada";
  loja_retirada_id: number | null;
  endereco: Record<string, string> | null;
  pagamento_metodo: string;
  subtotal: string;
  frete: string;
  total: string;
  cashback_usado: string;
  entrega_servico: string | null;
  pdvnet_status: string | null;
  nota_chave: string | null;
  nota_numero: string | null;
  pago_em: Date | null;
}

export interface LinhaItem {
  produto_ref: string;
  nome: string;
  cor: string | null;
  tamanho: string | null;
  quantidade: number;
  preco_unit: string;
}

export interface Variacao {
  variacao_id: string;
  produto_ref: string;
  cor: string | null;
  tamanho: string | null;
  ean: string | null;
}

const dec = (v: unknown) => (Math.round(Number(v) * 100) / 100).toFixed(2);

const partes = (d: Date) => {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" })
      .formatToParts(d)
      .map((x) => [x.type, x.value]),
  );
  return { data: `${p.year}-${p.month}-${p.day}`, hora: `${p.hour}:${p.minute}:${p.second}` };
};

/** Status do pedido na linguagem da Tray: o que o PDVNet informou por último, senão o do nosso fluxo. */
export function statusTray(r: Pick<LinhaPedido, "status" | "pdvnet_status">): { id: string; status: string } {
  if (r.pdvnet_status) {
    const s = STATUS_DE_CAPTURA.find((x) => x.id === r.pdvnet_status);
    return { id: r.pdvnet_status, status: s?.status ?? `Status ${r.pdvnet_status}` };
  }
  const mapa: Record<string, string> = { pago: "1", aguardando_pagamento: "1", em_separacao: "39", pronto_retirada: "39", enviado: "40", entregue: "41", cancelado: "9" };
  const id = mapa[r.status] ?? "1";
  return { id, status: STATUS_DE_CAPTURA.find((x) => x.id === id)?.status ?? "Pago" };
}

/** Acha a variação (EAN) do item: mesma ref + tamanho, e a cor quando houver mais de uma. */
export function acharVariacao(item: Pick<LinhaItem, "produto_ref" | "cor" | "tamanho">, variacoes: Variacao[]): Variacao | null {
  const norm = (s: string | null) => (s ?? "").trim().toLowerCase();
  const mesmas = variacoes.filter((v) => v.produto_ref === item.produto_ref && norm(v.tamanho) === norm(item.tamanho));
  if (mesmas.length <= 1) return mesmas[0] ?? null;
  return mesmas.find((v) => norm(v.cor) === norm(item.cor)) ?? null;
}

const formaDePagamento = (m: string) => (m === "pix" ? { rotulo: "Pix", tipo: "pix" } : m === "cartao" ? { rotulo: "Cartão de crédito", tipo: "credit_card" } : { rotulo: "Pagamento na loja", tipo: "other" });

export function montarPedido(r: LinhaPedido, itens: LinhaItem[], variacoes: Variacao[], completo: boolean) {
  const st = statusTray(r);
  const criado = partes(r.criado_em);
  const pago = r.pago_em ? partes(r.pago_em).data : "";
  const forma = formaDePagamento(r.pagamento_metodo);
  const loja = LOJAS.find((l) => l.id === r.loja_retirada_id)?.nome;
  const end = r.endereco ?? {};
  const fone = r.cliente_telefone.replace(/\D/g, "");
  const cashback = Number(r.cashback_usado) || 0;
  const nota = r.nota_numero || r.nota_chave;

  const order: Record<string, unknown> = {
    status: st.status,
    id: r.numero,
    date: criado.data,
    hour: criado.hora,
    customer_id: r.numero,
    partial_total: dec(r.subtotal),
    taxes: "0.00",
    discount: dec(cashback),
    point_sale: "LOJA VIRTUAL",
    shipment: r.entrega_tipo === "retirada_loja" ? `Retirada na loja ${loja ?? ""}`.trim() : (r.entrega_servico ?? "Entrega"),
    shipment_value: dec(r.frete),
    shipment_date: "",
    store_note: `Pedido do site Seleto nº ${r.numero}.${cashback > 0 ? ` Cashback da Seleto usado: R$ ${dec(cashback)} (já abatido do total; baixa feita pela Seleto).` : ""}`,
    customer_note: "",
    partner_id: "",
    discount_coupon: "",
    payment_method_rate: "0.00",
    installment: "1",
    value_1: "0.00",
    sending_code: "",
    payment_method: forma.rotulo,
    payment_method_type: forma.tipo,
    payment_form: forma.rotulo,
    total: dec(r.total),
    payment_date: pago,
    modified: `${partes(r.atualizado_em).data} ${partes(r.atualizado_em).hora}`,
    external_code: `SITE-${r.numero}`,
    has_payment: "1",
    has_shipment: "0",
    has_invoice: nota ? "1" : "0",
    OrderStatus: { id: st.id, status: st.status, type: "open", default: "0" },
  };
  if (!completo) return { Order: order };

  const cep = (end.cep ?? "").replace(/^(\d{5})(\d{3})$/, "$1-$2");
  order.Customer = {
    id: r.numero,
    name: r.cliente_nome,
    cpf: r.cliente_cpf ?? "",
    cnpj: "",
    email: r.cliente_email ?? "",
    phone: fone,
    cellphone: fone,
    type: "0",
    address: end.logradouro ?? "",
    number: end.numero ?? "",
    complement: end.complemento ?? "",
    neighborhood: end.bairro ?? "",
    city: end.cidade ?? "",
    state: end.uf ?? "",
    zip_code: cep,
    country: "Brasil",
    CustomerAddresses: end.logradouro
      ? [{ CustomerAddress: { id: r.numero, customer_id: r.numero, address: end.logradouro, number: end.numero ?? "", complement: end.complemento ?? "", neighborhood: end.bairro ?? "", city: end.cidade ?? "", state: end.uf ?? "", zip_code: cep, country: "Brasil", type: "1", active: "1", recipient: r.cliente_nome }}]
      : [],
  };
  order.ProductsSold = itens.map((i, n) => {
    const v = acharVariacao(i, variacoes);
    return {
      ProductsSold: {
        id: String(n + 1),
        order_id: r.numero,
        product_id: i.produto_ref,
        variant_id: v?.variacao_id ?? "0",
        quantity: String(i.quantidade),
        name: `${i.nome} (Ref. ${i.produto_ref})`,
        original_name: i.nome,
        reference: i.produto_ref,
        ean: v?.ean ?? "",
        Sku: [
          { type: "Cor", value: i.cor ?? "" },
          { type: "Tamanho", value: i.tamanho ?? "" },
        ],
        price: dec(i.preco_unit),
        original_price: dec(i.preco_unit),
        brand: "",
        model: "",
        ncm: "",
        virtual_product: "0",
      },
    };
  });
  order.Payment = [{ Payment: { id: r.numero, order_id: r.numero, method: forma.rotulo, payment_method_id: "", value: dec(r.total), date: pago, note: "" } }];
  order.OrderInvoice = nota ? [{ OrderInvoice: { id: r.numero, order_id: r.numero, number: r.nota_numero ?? "", key: r.nota_chave ?? "" } }] : [];
  return { Order: order };
}

/**
 * Achata o corpo de um PUT/POST do PDVNet (formulário `["Order"]["status_id"]=31`, `Order[status_id]=31`, `status_id=31` ou JSON)
 * em { "Order.status_id": "31", ... }. Só lê texto; limita tamanho e quantidade de campos.
 */
export function achatarCorpo(texto: string): Record<string, string> {
  const saida: Record<string, string> = {};
  const t = texto.slice(0, 20_000);
  const pegar = (chave: string, valor: unknown) => {
    const caminho = [...chave.matchAll(/[A-Za-z_][A-Za-z0-9_]*/g)].map((m) => m[0]);
    if (!caminho.length || Object.keys(saida).length > 60) return;
    saida[caminho.join(".")] = String(valor ?? "").slice(0, 2000);
  };
  const andar = (o: unknown, prefixo: string) => {
    if (o && typeof o === "object" && !Array.isArray(o)) for (const [k, v] of Object.entries(o)) andar(v, prefixo ? `${prefixo}.${k}` : k);
    else if (prefixo) pegar(prefixo, o);
  };
  try {
    const j = JSON.parse(t);
    if (j && typeof j === "object") {
      andar(j, "");
      return saida;
    }
  } catch {
    /* não é JSON: formulário */
  }
  for (const [k, v] of new URLSearchParams(t)) pegar(k, v);
  return saida;
}

/** Valor de um campo, pelo último nome do caminho (ex.: "status_id" acha "Order.status_id"). */
export const campo = (c: Record<string, string>, nome: string): string | null => {
  const k = Object.keys(c).find((x) => x === nome || x.endsWith(`.${nome}`));
  return k ? c[k] : null;
};

export interface DadosNota {
  numero: string | null;
  serie: string | null;
  chave: string | null;
  valor: string | null;
}

/** Nota fiscal enviada pelo PDVNet. A chave tem 44 dígitos; fora disso é descartada (sem aceitar lixo). */
export function lerNota(c: Record<string, string>): DadosNota {
  const chave = (campo(c, "key") ?? "").replace(/\D/g, "");
  const numero = (campo(c, "number") ?? "").replace(/[^0-9A-Za-z-]/g, "").slice(0, 20);
  return { numero: numero || null, serie: (campo(c, "serie") ?? "").slice(0, 10) || null, chave: chave.length === 44 ? chave : null, valor: campo(c, "value") };
}

export function pedidoNaoEncontrado() {
  return { code: 404, message: "Not Found", causes: ["Pedido não encontrado."] };
}
