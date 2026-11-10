import type { MetadataRoute } from "next";
import { buscar, garantirCatalogo } from "@/lib/catalogo";
import { SITE_URL } from "@/lib/site";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await garantirCatalogo();
  const fixas = ["", "/produtos", "/trocas", "/privacidade"].map((p) => ({
    url: `${SITE_URL}${p}`,
    changeFrequency: p === "" || p === "/produtos" ? ("daily" as const) : ("yearly" as const),
    priority: p === "" ? 1 : p === "/produtos" ? 0.9 : 0.3,
  }));
  const produtos = buscar({}).map((p) => ({ url: `${SITE_URL}/produto/${encodeURIComponent(p.ref)}`, changeFrequency: "daily" as const, priority: 0.7 }));
  return [...fixas, ...produtos];
}
