/**
 * Modo real x teste. `NEXT_PUBLIC_MODO_REAL=1` (definido na Vercel ANTES do build) tira os avisos de "ambiente de teste",
 * esconde as dicas de CPF de demonstração e libera a indexação no Google. Os dados reais dependem do banco
 * (`LOJA_DATABASE_URL`), que é uma coisa à parte: o modo real sem banco não grava pedidos.
 */
export const MODO_REAL = process.env.NEXT_PUBLIC_MODO_REAL === "1";
