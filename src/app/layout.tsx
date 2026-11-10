import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { CarrinhoProvider } from "@/lib/carrinho";
import { Cabecalho } from "@/components/Cabecalho";
import { Rodape } from "@/components/Rodape";
import { Sacola } from "@/components/Sacola";
import { PopupEntrada } from "@/components/PopupEntrada";
import { Miolo } from "@/components/Miolo";
import { dadosMenu } from "@/lib/catalogo";
import { MODO_REAL, blackFridayAtiva } from "@/lib/modo";

const geist = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Seleto — loja online",
  description: "Tênis, camisetas e acessórios das melhores marcas. Entregamos para todo o Brasil.",
  robots: MODO_REAL ? { index: true, follow: true } : { index: false, follow: false }, // teste: fora do Google
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${geist.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <CarrinhoProvider>
          <Cabecalho menu={dadosMenu()} teste={!MODO_REAL} blackFriday={blackFridayAtiva()} />
          <Miolo>{children}</Miolo>
          <Rodape />
          <Sacola />
          {blackFridayAtiva() ? <PopupEntrada /> : null}
        </CarrinhoProvider>
      </body>
    </html>
  );
}
