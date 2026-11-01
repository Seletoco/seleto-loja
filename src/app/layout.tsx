import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { CarrinhoProvider } from "@/lib/carrinho";
import { Cabecalho } from "@/components/Cabecalho";
import { Rodape } from "@/components/Rodape";
import { Sacola } from "@/components/Sacola";
import { Miolo } from "@/components/Miolo";
import { dadosMenu } from "@/lib/catalogo";

const geist = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Seleto — loja online",
  description: "Tênis, camisetas e acessórios das melhores marcas. Entregamos para todo o Brasil.",
  robots: { index: false, follow: false }, // ambiente de teste: fora do Google até aprovar
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${geist.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <CarrinhoProvider>
          <Cabecalho menu={dadosMenu()} />
          <Miolo>{children}</Miolo>
          <Rodape />
          <Sacola />
        </CarrinhoProvider>
      </body>
    </html>
  );
}
