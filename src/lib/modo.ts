/**
 * Modo real x teste. `NEXT_PUBLIC_MODO_REAL=1` (definido na Vercel ANTES do build) tira os avisos de "ambiente de teste",
 * esconde as dicas de CPF de demonstração e libera a indexação no Google. Os dados reais dependem do banco
 * (`LOJA_DATABASE_URL`), que é uma coisa à parte: o modo real sem banco não grava pedidos.
 */
export const MODO_REAL = process.env.NEXT_PUBLIC_MODO_REAL === "1";

/**
 * Faixa de Black Friday: aparece em desenvolvimento e nos deploys de PRÉVIA da Vercel (para o dono ver),
 * mas em PRODUÇÃO só com `NEXT_PUBLIC_BLACK_FRIDAY=1`. Assim nada de promoção vai ao ar por acidente.
 */
export const blackFridayAtiva = () =>
  process.env.NEXT_PUBLIC_BLACK_FRIDAY === "1" || process.env.NEXT_PUBLIC_VERCEL_ENV !== "production";

/** Com `NEXT_PUBLIC_EXIGIR_LOGIN=1`, só quem tem conta e está logado consegue finalizar um pedido. Desligado por padrão. */
export const EXIGIR_LOGIN = process.env.NEXT_PUBLIC_EXIGIR_LOGIN === "1";
