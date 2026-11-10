export interface CashbackItem {
  valor: number;
  liberaEm: string; // AAAA-MM-DD
  venceEm: string;
}
export interface ExtratoItem {
  ganhou: number;
  usou: number;
  saldo: number;
  data: string; // AAAA-MM-DD
  venceEm: string;
}
export interface CompraItem {
  id: string;
  data: string; // ISO
  loja: string;
  valor: number;
  cashbackUsado: number;
  itens: { nome: string; detalhe: string; quantidade: number }[];
}
export interface Nivel {
  nome: "Cliente" | "Prata" | "Ouro" | "Diamante";
  proximo: "Prata" | "Ouro" | "Diamante" | null;
  faltaGasto: number; // R$ que faltam para o próximo nível
  faltaCompras: number;
  gasto12m: number;
  compras12m: number;
}
export interface Preferencias {
  avisosCashback: boolean;
  avisosPromocoes: boolean;
}
export interface Alerta {
  id: string;
  descricao: string;
  tamanho: string | null;
}
export interface DadosConta {
  nome: string;
  demo: boolean;
  /** Login só por CPF: o histórico de compras fica oculto até existir verificação por WhatsApp. */
  comprasOcultas: boolean;
  cashbacks: CashbackItem[];
  extrato: ExtratoItem[];
  compras: CompraItem[];
  nivel: Nivel;
  preferencias: Preferencias;
  alertas: Alerta[];
  /** Link do grupo VIP (qualquer cliente logado pode entrar); null se a lista VIP está desligada. */
  vipLink: string | null;
  /** Código para indicar amigos (fixo por cliente). */
  codigoIndicacao: string;
  /**
   * Grupo VIP do NÍVEL do cliente no WhatsApp (Ouro -> grupo Ouro, Diamante -> grupo Diamante; Prata não tem grupo).
   * null = fora desses níveis ou grupo sem link. O link nunca vai para quem não está nesse nível.
   */
  grupoVip: { nivel: "Ouro" | "Diamante"; nome: string; link: string } | null;
}

/** Mesma régua do SeleChat (src/lib/vip.ts): VIP = 3+ compras e R$ 1.000+ em 12 meses; Ouro R$ 2.000; Diamante R$ 4.000. */
export function calcularNivel(compras12m: number, gasto12m: number): Nivel {
  const base = { gasto12m, compras12m };
  const vip = compras12m >= 3 && gasto12m >= 1000;
  if (gasto12m >= 4000 && vip) return { ...base, nome: "Diamante", proximo: null, faltaGasto: 0, faltaCompras: 0 };
  if (gasto12m >= 2000 && vip) return { ...base, nome: "Ouro", proximo: "Diamante", faltaGasto: 4000 - gasto12m, faltaCompras: 0 };
  if (vip) return { ...base, nome: "Prata", proximo: "Ouro", faltaGasto: 2000 - gasto12m, faltaCompras: 0 };
  return { ...base, nome: "Cliente", proximo: "Prata", faltaGasto: Math.max(0, 1000 - gasto12m), faltaCompras: Math.max(0, 3 - compras12m) };
}
