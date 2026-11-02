/**
 * REGRA DE USO DO CASHBACK NA LOJA ONLINE.
 *
 * VALORES DE EXEMPLO — serão definidos no sistema. Para mudar agora, edite aqui; quando a regra passar a morar no
 * sistema (ex.: uma tabela/tela de configuração), basta trocar `regraDeUso()` por uma leitura do banco: o checkout
 * e o servidor só falam com esta função.
 *
 * Observação: `cashback_regras` do banco é a regra de GERAÇÃO do cashback (percentual, valor mínimo para ganhar),
 * não a de uso — por isso não foi reaproveitada aqui.
 */
export interface RegraDeUso {
  /** Subtotal mínimo do pedido (antes de descontos) para poder usar cashback. */
  compraMinima: number;
  /** Quanto do subtotal o cashback pode cobrir, em %. 100 = pode pagar tudo. */
  tetoPercentualDaCompra: number;
  /** Mostra "(exemplo)" na tela enquanto a regra for provisória. */
  exemplo: boolean;
}

export const regraDeUso = (): RegraDeUso => ({ compraMinima: 500, tetoPercentualDaCompra: 100, exemplo: true });

export interface CashbackDoCliente {
  valor: number;
  liberaEm: string; // AAAA-MM-DD
  venceEm: string;
}

export interface SituacaoDoCashback {
  /** Já liberado e dentro da validade. */
  disponivel: number;
  /** Em carência (ainda não pode usar). */
  aLiberar: number;
  proximaLiberacao: string | null;
  /** O que dá para abater NESTE pedido, pela regra. */
  utilizavel: number;
  /** Quanto falta no pedido para atingir a compra mínima (0 se já atingiu). */
  faltaParaMinimo: number;
  /** Tem cashback liberado, mas o pedido ainda não atinge o mínimo. */
  bloqueadoPeloMinimo: boolean;
}

/** `hoje` = AAAA-MM-DD em Brasília. Função pura (testável). */
export function situacaoDoCashback(
  lista: CashbackDoCliente[],
  subtotal: number,
  hoje: string,
  regra: RegraDeUso = regraDeUso(),
): SituacaoDoCashback {
  const vigentes = lista.filter((c) => c.venceEm >= hoje);
  const liberados = vigentes.filter((c) => c.liberaEm <= hoje);
  const emCarencia = vigentes.filter((c) => c.liberaEm > hoje);
  const soma = (l: CashbackDoCliente[]) => Math.round(l.reduce((s, c) => s + c.valor, 0) * 100) / 100;

  const disponivel = soma(liberados);
  const aLiberar = soma(emCarencia);
  const proximaLiberacao = emCarencia.map((c) => c.liberaEm).sort()[0] ?? null;
  const atingiuMinimo = subtotal >= regra.compraMinima;
  const teto = Math.round(subtotal * regra.tetoPercentualDaCompra) / 100;
  const utilizavel = atingiuMinimo ? Math.round(Math.min(disponivel, teto) * 100) / 100 : 0;

  return {
    disponivel,
    aLiberar,
    proximaLiberacao,
    utilizavel,
    faltaParaMinimo: atingiuMinimo ? 0 : Math.round((regra.compraMinima - subtotal) * 100) / 100,
    bloqueadoPeloMinimo: !atingiuMinimo && disponivel > 0,
  };
}
