/**
 * Frete: regras puras (sem rede) — peso e embalagem por categoria, UF pelo CEP e a ESTIMATIVA de exemplo.
 *
 * ATENÇÃO — a estimativa NÃO é a tabela dos Correios: serve só para testar o fluxo enquanto as credenciais do contrato
 * não estão configuradas. Com elas (ver `correios.ts`), o valor e o prazo vêm direto dos Correios.
 */

export interface ItemFrete {
  categoria: string;
  quantidade: number;
}

export interface Embalagem {
  /** gramas */
  pesoG: number;
  /** centímetros */
  comprimento: number;
  largura: number;
  altura: number;
}

/** Peso e caixa de CADA unidade, por categoria. Valores assumidos — ajuste conforme a realidade da loja. */
const POR_CATEGORIA: Record<string, Embalagem> = {
  "Tênis": { pesoG: 1200, comprimento: 33, largura: 22, altura: 13 },
  Camisetas: { pesoG: 300, comprimento: 28, largura: 22, altura: 4 },
  Shorts: { pesoG: 350, comprimento: 28, largura: 22, altura: 5 },
  "Calças": { pesoG: 600, comprimento: 30, largura: 24, altura: 6 },
  "Casacos e Moletons": { pesoG: 800, comprimento: 32, largura: 26, altura: 8 },
  Chinelos: { pesoG: 450, comprimento: 32, largura: 20, altura: 9 },
  "Bonés": { pesoG: 150, comprimento: 22, largura: 20, altura: 12 },
  "Bolsas e Mochilas": { pesoG: 500, comprimento: 32, largura: 26, altura: 10 },
  Farm: { pesoG: 350, comprimento: 28, largura: 22, altura: 5 },
};
const PADRAO: Embalagem = { pesoG: 400, comprimento: 28, largura: 22, altura: 6 };

/** Mínimos aceitos pelos Correios para encomenda (caixa/pacote). */
const MIN = { comprimento: 16, largura: 11, altura: 2 };
const MAX_SOMA_CM = 200; // comprimento + largura + altura
const MAX_PESO_G = 30_000;

/** Junta os itens numa encomenda só: soma os pesos e as alturas, usa o maior comprimento e a maior largura. */
export function embalagemDoPedido(itens: ItemFrete[]): Embalagem {
  let pesoG = 0;
  let comprimento = MIN.comprimento;
  let largura = MIN.largura;
  let altura = 0;
  for (const it of itens) {
    const e = POR_CATEGORIA[it.categoria] ?? PADRAO;
    const q = Math.max(1, Math.floor(it.quantidade));
    pesoG += e.pesoG * q;
    comprimento = Math.max(comprimento, e.comprimento);
    largura = Math.max(largura, e.largura);
    altura += e.altura * q;
  }
  altura = Math.max(MIN.altura, altura);
  // se a pilha passa do limite dos Correios, empilha "de lado": troca altura por largura (aproximação)
  while (comprimento + largura + altura > MAX_SOMA_CM && altura > largura) {
    altura = Math.ceil(altura / 2);
    largura *= 2;
  }
  return { pesoG: Math.min(pesoG, MAX_PESO_G), comprimento, largura, altura };
}

export const cepValido = (cep: string): boolean => /^\d{8}$/.test(cep.replace(/\D/g, "")) && !/^0{8}$/.test(cep.replace(/\D/g, ""));

/** UF pela faixa do CEP (faixas públicas dos Correios, resolução de estado). */
export function ufDoCep(cep: string): string | null {
  const n = Number(cep.replace(/\D/g, "").slice(0, 5));
  if (!Number.isFinite(n) || cep.replace(/\D/g, "").length !== 8) return null;
  const faixas: [number, number, string][] = [
    [1000, 19999, "SP"], [20000, 28999, "RJ"], [29000, 29999, "ES"], [30000, 39999, "MG"], [40000, 48999, "BA"],
    [49000, 49999, "SE"], [50000, 56999, "PE"], [57000, 57999, "AL"], [58000, 58999, "PB"], [59000, 59999, "RN"],
    [60000, 63999, "CE"], [64000, 64999, "PI"], [65000, 65999, "MA"], [66000, 68899, "PA"], [68900, 68999, "AP"],
    [69000, 69299, "AM"], [69300, 69399, "RR"], [69400, 69899, "AM"], [69900, 69999, "AC"], [70000, 72799, "DF"],
    [72800, 73699, "GO"], [73700, 76799, "GO"], [76800, 76999, "RO"], [77000, 77999, "TO"], [78000, 78899, "MT"],
    [79000, 79999, "MS"], [80000, 87999, "PR"], [88000, 89999, "SC"], [90000, 99999, "RS"],
  ];
  return faixas.find(([a, b]) => n >= a && n <= b)?.[2] ?? null;
}

type Zona = "mesmo_estado" | "sudeste" | "sul_centro" | "nordeste" | "norte";
const REGIAO: Record<string, Zona> = {
  SP: "sudeste", MG: "sudeste", ES: "sudeste",
  PR: "sul_centro", SC: "sul_centro", RS: "sul_centro", DF: "sul_centro", GO: "sul_centro", MT: "sul_centro", MS: "sul_centro",
  BA: "nordeste", SE: "nordeste", AL: "nordeste", PE: "nordeste", PB: "nordeste", RN: "nordeste", CE: "nordeste", PI: "nordeste", MA: "nordeste",
  PA: "norte", AP: "norte", AM: "norte", RR: "norte", AC: "norte", RO: "norte", TO: "norte",
};

export interface OpcaoFrete {
  servico: "PAC" | "SEDEX";
  nome: string;
  valor: number;
  prazoDias: number; // dias úteis
  /** true = estimativa de exemplo (sem as credenciais dos Correios). */
  exemplo: boolean;
}

/** Estimativa de exemplo, a partir de uma origem no RJ. Valores ilustrativos, NÃO são os dos Correios. */
export function estimativaDeExemplo(uf: string, emb: Embalagem, ufOrigem = "RJ"): OpcaoFrete[] {
  const zona: Zona = uf === ufOrigem ? "mesmo_estado" : (REGIAO[uf] ?? "norte");
  const base: Record<Zona, { pac: number; sedex: number; pacDias: number; sedexDias: number }> = {
    mesmo_estado: { pac: 16, sedex: 24, pacDias: 3, sedexDias: 1 },
    sudeste: { pac: 21, sedex: 32, pacDias: 5, sedexDias: 2 },
    sul_centro: { pac: 27, sedex: 42, pacDias: 7, sedexDias: 3 },
    nordeste: { pac: 33, sedex: 52, pacDias: 9, sedexDias: 4 },
    norte: { pac: 39, sedex: 62, pacDias: 12, sedexDias: 5 },
  };
  const b = base[zona];
  const kg = Math.max(1, Math.ceil(emb.pesoG / 1000));
  const extra = (kg - 1) * (zona === "mesmo_estado" ? 3 : 5);
  const arredonda = (n: number) => Math.round(n * 100) / 100;
  return [
    { servico: "PAC", nome: "PAC", valor: arredonda(b.pac + extra), prazoDias: b.pacDias, exemplo: true },
    { servico: "SEDEX", nome: "SEDEX", valor: arredonda(b.sedex + extra * 1.6), prazoDias: b.sedexDias, exemplo: true },
  ];
}

/** Frete grátis a partir de um valor (null = desligado). Regra de exemplo, para definir depois. */
export const FRETE_GRATIS_ACIMA: number | null = null;
