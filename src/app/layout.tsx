import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { CarrinhoProvider } from "@/lib/carrinho";
import { Cabecalho } from "@/components/Cabecalho";
import { LOJAS } from "@/lib/lojas";

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
          <div className="bg-texto px-4 py-1.5 text-center text-xs font-medium text-white">
            Ambiente de teste — pedidos e pagamentos são só de exemplo
          </div>
          <Cabecalho />
          <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{children}</main>
          <footer className="mt-10 border-t border-borda bg-painel">
            <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 text-sm sm:grid-cols-3">
              <div>
                <p className="font-black tracking-[0.25em]">SELETO</p>
                <p className="mt-2 text-fraco">Entregamos para todo o Brasil ou você retira em uma das nossas lojas.</p>
              </div>
              <div>
                <p className="font-semibold">Lojas</p>
                <ul className="mt-2 space-y-1 text-fraco">
                  {LOJAS.map((l) => (
                    <li key={l.id}>{l.nome}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="font-semibold">Ajuda</p>
                <ul className="mt-2 space-y-1 text-fraco">
                  <li>Trocas e devoluções (modelo a revisar)</li>
                  <li>Política de privacidade (modelo a revisar)</li>
                </ul>
              </div>
            </div>
          </footer>
        </CarrinhoProvider>
      </body>
    </html>
  );
}
