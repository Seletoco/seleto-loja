/**
 * Cotação de frete pela API dos Correios (CWS) — preço e prazo de PAC e SEDEX com contrato.
 *
 * LIGA SOZINHA quando as variáveis de ambiente existem (as credenciais são do CONTRATO da loja com os Correios):
 *   CORREIOS_USUARIO, CORREIOS_CODIGO_ACESSO, CORREIOS_CARTAO_POSTAGEM, CORREIOS_CONTRATO
 *   (opcionais: CORREIOS_DR = diretoria regional; CEP_ORIGEM para trocar o CEP de origem)
 * Sem elas, `/api/frete` devolve a estimativa de exemplo.
 *
 * NÃO FOI TESTADA contra a API real (sem credenciais aqui). Foi escrita de forma defensiva: qualquer resposta fora do
 * esperado vira erro, e a rota cai na estimativa de exemplo avisando — nunca mostra preço inventado como se fosse dos
 * Correios. Confira com a primeira cotação real.
 */
import type { Embalagem, OpcaoFrete } from "./frete";

const BASE = "https://api.correios.com.br";
const PRODUTOS: { servico: OpcaoFrete["servico"]; nome: string; coProduto: string }[] = [
  { servico: "PAC", nome: "PAC", coProduto: "03298" },
  { servico: "SEDEX", nome: "SEDEX", coProduto: "03220" },
];

/** De onde saem os pedidos: Av. Ayrton Senna, 2541 — Barra da Tijuca, Rio de Janeiro/RJ. */
export const CEP_ORIGEM_PADRAO = "22631004";
export const cepDeOrigem = (): string => (process.env.CEP_ORIGEM ?? CEP_ORIGEM_PADRAO).replace(/\D/g, "") || CEP_ORIGEM_PADRAO;

export const correiosConfigurado = (): boolean =>
  Boolean(process.env.CORREIOS_USUARIO && process.env.CORREIOS_CODIGO_ACESSO && process.env.CORREIOS_CARTAO_POSTAGEM && process.env.CORREIOS_CONTRATO);

let guardado: { token: string; ate: number } | null = null;

async function token(): Promise<string> {
  if (guardado && guardado.ate > Date.now() + 60_000) return guardado.token;
  const basic = Buffer.from(`${process.env.CORREIOS_USUARIO}:${process.env.CORREIOS_CODIGO_ACESSO}`).toString("base64");
  const r = await fetch(`${BASE}/token/v1/autentica/cartaopostagem`, {
    method: "POST",
    headers: { Authorization: `Basic ${basic}`, "Content-Type": "application/json" },
    body: JSON.stringify({ numero: process.env.CORREIOS_CARTAO_POSTAGEM }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!r.ok) throw new Error(`login nos Correios falhou (${r.status})`);
  const j = (await r.json()) as { token?: string; expiraEm?: string };
  if (!j.token) throw new Error("resposta de login dos Correios sem token");
  guardado = { token: j.token, ate: j.expiraEm ? Date.parse(j.expiraEm) || Date.now() + 3_000_000 : Date.now() + 3_000_000 };
  return j.token;
}

/** "1.234,56" ou "23,45" ou 23.45 -> número. */
const numero = (v: unknown): number => {
  if (typeof v === "number") return v;
  const s = String(v ?? "").trim();
  if (!s) return NaN;
  return Number(s.includes(",") ? s.replace(/\./g, "").replace(",", ".") : s);
};

export async function cotarNosCorreios(cepDestino: string, emb: Embalagem): Promise<OpcaoFrete[]> {
  const t = await token();
  const cabecalho = { Authorization: `Bearer ${t}`, Accept: "application/json" };
  const origem = cepDeOrigem();
  const destino = cepDestino.replace(/\D/g, "");

  const opcoes = await Promise.all(
    PRODUTOS.map(async (p) => {
      const preco = new URLSearchParams({
        cepOrigem: origem, cepDestino: destino, psObjeto: String(Math.max(1, Math.round(emb.pesoG))), tpObjeto: "2",
        comprimento: String(Math.ceil(emb.comprimento)), largura: String(Math.ceil(emb.largura)), altura: String(Math.ceil(emb.altura)),
        nuContrato: String(process.env.CORREIOS_CONTRATO),
      });
      if (process.env.CORREIOS_DR) preco.set("nuDR", process.env.CORREIOS_DR);
      const prazo = new URLSearchParams({ cepOrigem: origem, cepDestino: destino });

      const [rp, rz] = await Promise.all([
        fetch(`${BASE}/preco/v1/nacional/${p.coProduto}?${preco}`, { headers: cabecalho, signal: AbortSignal.timeout(12_000) }),
        fetch(`${BASE}/prazo/v1/nacional/${p.coProduto}?${prazo}`, { headers: cabecalho, signal: AbortSignal.timeout(12_000) }),
      ]);
      if (!rp.ok || !rz.ok) throw new Error(`${p.nome}: Correios respondeu ${rp.status}/${rz.status}`);
      const jp = (await rp.json()) as Record<string, unknown>;
      const jz = (await rz.json()) as Record<string, unknown>;
      const valor = numero(jp.pcFinal ?? jp.pcBase);
      const dias = Number(jz.prazoEntrega);
      if (!Number.isFinite(valor) || valor <= 0 || !Number.isFinite(dias) || dias <= 0) throw new Error(`${p.nome}: resposta dos Correios sem preço ou prazo`);
      return { servico: p.servico, nome: p.nome, valor: Math.round(valor * 100) / 100, prazoDias: dias, exemplo: false } satisfies OpcaoFrete;
    }),
  );
  return opcoes;
}
