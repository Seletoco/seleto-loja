import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { CarrinhoProvider } from "@/lib/carrinho";
import { Cabecalho } from "@/components/Cabecalho";
import { Rodape } from "@/components/Rodape";
import { Sacola } from "@/components/Sacola";
import { PopupEntrada } from "@/components/PopupEntrada";
import { Miolo } from "@/components/Miolo";
import { dadosMenu, garantirCatalogo } from "@/lib/catalogo";
import { logosPorMarca } from "@/lib/logos";
import { MODO_REAL, blackFridayAtiva } from "@/lib/modo";
import { BalaoWhatsapp } from "@/components/BalaoWhatsapp";
import { linkWhatsappGeral } from "@/lib/lojas";
import { NOME_SITE, SITE_URL } from "@/lib/site";

const geist = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

const DESCRICAO = "Tênis, roupas e acessórios das melhores marcas. Retire na loja ou receba em casa, em todo o Brasil.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "Seleto — loja online", template: "%s | Seleto" },
  description: DESCRICAO,
  applicationName: NOME_SITE,
  openGraph: { type: "website", locale: "pt_BR", siteName: NOME_SITE, title: "Seleto — loja online", description: DESCRICAO },
  twitter: { card: "summary_large_image", title: "Seleto — loja online", description: DESCRICAO },
  robots: MODO_REAL ? { index: true, follow: true } : { index: false, follow: false }, // teste: fora do Google
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  await garantirCatalogo();
  const menu = dadosMenu();
  const zap = linkWhatsappGeral("Olá! Vim pelo site da Seleto e queria uma ajuda.");
  return (
    <html lang="pt-BR" className={`${geist.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <CarrinhoProvider>
          <Cabecalho menu={menu} logos={logosPorMarca(menu.marcas.concat(menu.marcasTenis))} teste={!MODO_REAL} blackFriday={blackFridayAtiva()} />
          <Miolo>{children}</Miolo>
          <Rodape />
          <Sacola />
          {blackFridayAtiva() ? <PopupEntrada /> : null}
          {zap ? <BalaoWhatsapp href={zap} /> : null}
        </CarrinhoProvider>
      </body>
    </html>
  );
}
