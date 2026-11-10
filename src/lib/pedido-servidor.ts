/**
 * Validação do pedido NO SERVIDOR. O navegador manda só o que o cliente escolheu; preços, total e forma de pagamento
 * são recalculados aqui (o cliente nunca decide quanto paga). Função pura, sem banco: testável.
 */
import { formaDaEntrega } from "./pagamento";
import { LOJAS } from "./lojas";
import type { Produto } from "./tipos";

export interface PedidoRecebido {
  itens?: { ref?: unknown; tamanho?: unknown; quantidade?: unknown }[];
  cliente?: { nome?: unknown; telefone?: unknown; email?: unknown };
  entrega?: { tipo?: unknown; loja?: unknown; endereco?: unknown; servico?: unknown; prazoDias?: unknown; freteExemplo?: unknown };
  frete?: unknown;
  cashback?: { usado?: unknown; telefone?: unknown } | null;
}

export interface PedidoValidado {
  itens: { ref: string; nome: string; cor: string; tamanho: string; quantidade: number; preco: number }[];
  cliente: { nome: string; telefone: string; email: string | null };
  entrega: { tipo: "retirada_loja" | "entrega_combinada"; lojaId: number | null; endereco: string | null; servico: string | null; prazoDias: number | null; freteEstimado: boolean };
  pagamentoMetodo: "pagar_na_loja" | "combinar_whatsapp";
  subtotal: number;
  frete: number;
  cashbackUsado: number;
  cashbackTelefone: string | null;
  total: number;
}

const FRETE_MAX = 500; // teto de sanidade: a loja confirma o frete com o cliente antes de cobrar
const arred = (n: number) => Math.round(n * 100) / 100;
const texto = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);

export function validarPedido(
  r: PedidoRecebido,
  produto: (ref: string) => Produto | undefined,
  tetoCashbackPct: number,
): { erro: string } | { pedido: PedidoValidado } {
  const brutos = Array.isArray(r.itens) ? r.itens.slice(0, 50) : [];
  if (brutos.length === 0) return { erro: "A sacola está vazia." };

  const itens: PedidoValidado["itens"] = [];
  for (const i of brutos) {
    const p = produto(texto(i.ref, 40));
    const tamanho = texto(i.tamanho, 12);
    const quantidade = Math.floor(Number(i.quantidade));
    if (!p) return { erro: "Um produto da sacola não existe mais. Atualize a sacola." };
    if (!p.tamanhos.includes(tamanho)) return { erro: `O tamanho ${tamanho || "?"} de ${p.nome} não está disponível.` };
    if (!(quantidade >= 1 && quantidade <= 20)) return { erro: "Quantidade inválida." };
    const ja = itens.find((x) => x.ref === p.ref && x.tamanho === tamanho);
    if (ja) ja.quantidade = Math.min(20, ja.quantidade + quantidade);
    else itens.push({ ref: p.ref, nome: p.nome, cor: p.cor, tamanho, quantidade, preco: p.preco });
  }

  const nome = texto(r.cliente?.nome, 120);
  const telefone = texto(r.cliente?.telefone, 20).replace(/\D/g, "");
  const email = texto(r.cliente?.email, 160);
  if (nome.length < 3) return { erro: "Informe seu nome completo." };
  if (telefone.length < 10 || telefone.length > 11) return { erro: "Informe o celular com DDD." };
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return { erro: "E-mail inválido." };

  const tipo = r.entrega?.tipo;
  if (tipo !== "retirada_loja" && tipo !== "entrega_combinada") return { erro: "Escolha retirada na loja ou entrega." };
  let lojaId: number | null = null;
  let endereco: string | null = null;
  let servico: string | null = null;
  let prazoDias: number | null = null;
  let frete = 0;
  let freteEstimado = false;
  if (tipo === "retirada_loja") {
    const loja = LOJAS.find((l) => l.nome === texto(r.entrega?.loja, 40));
    if (!loja) return { erro: "Escolha a loja para retirada." };
    lojaId = loja.id;
  } else {
    endereco = texto(r.entrega?.endereco, 300);
    servico = texto(r.entrega?.servico, 30) || null;
    const prazo = Math.floor(Number(r.entrega?.prazoDias));
    prazoDias = prazo >= 0 && prazo <= 60 ? prazo : null;
    frete = arred(Number(r.frete));
    freteEstimado = r.entrega?.freteExemplo === true;
    if (endereco.length < 10) return { erro: "Informe o endereço completo." };
    if (!(frete >= 0 && frete <= FRETE_MAX)) return { erro: "Frete inválido. Calcule o frete de novo." };
  }

  const subtotal = arred(itens.reduce((s, i) => s + i.preco * i.quantidade, 0));
  // Cashback: o servidor só limita ao teto do sistema. Saldo e uso são confirmados pela loja antes de separar (como já avisa o checkout).
  const pedido = Math.max(0, arred(Number(r.cashback?.usado) || 0));
  const cashbackUsado = Math.min(pedido, Math.floor(subtotal * tetoCashbackPct) / 100); // teto sempre arredondado para BAIXO
  const cashbackTelefone = cashbackUsado > 0 ? texto(r.cashback?.telefone, 20).replace(/\D/g, "") || null : null;

  return {
    pedido: {
      itens,
      cliente: { nome, telefone, email: email || null },
      entrega: { tipo, lojaId, endereco, servico, prazoDias, freteEstimado },
      pagamentoMetodo: formaDaEntrega(tipo).id,
      subtotal,
      frete,
      cashbackUsado,
      cashbackTelefone,
      total: arred(subtotal + frete - cashbackUsado),
    },
  };
}

/**
 * Cashback do pedido conferido com o SALDO REAL de quem está logado: nunca passa do que a regra libera para esta compra.
 * `utilizavel` vem de `situacaoDoCashback` (saldo liberado, teto e compra mínima). Função pura.
 */
export function limitarCashbackAoSaldo(p: PedidoValidado, utilizavel: number): PedidoValidado {
  const permitido = Math.max(0, Math.floor(utilizavel * 100) / 100);
  const usado = Math.min(p.cashbackUsado, permitido);
  if (usado === p.cashbackUsado) return p;
  return { ...p, cashbackUsado: usado, total: arred(p.subtotal + p.frete - usado) };
}
