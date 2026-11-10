import type { MetadataRoute } from "next";
import { MODO_REAL } from "@/lib/modo";
import { SITE_URL } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  // Fora do modo real (testes e prévias) nada é indexado.
  if (!MODO_REAL) return { rules: { userAgent: "*", disallow: "/" } };
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/api/", "/conta", "/carrinho", "/checkout", "/pedido/"] },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
