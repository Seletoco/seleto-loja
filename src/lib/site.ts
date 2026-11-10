/** Endereço público do site (para robots, sitemap, links canônicos e prévias). Defina NEXT_PUBLIC_SITE_URL quando houver domínio próprio. */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://seleto-loja.vercel.app").replace(/\/+$/, "");
export const NOME_SITE = "Seleto Store";
