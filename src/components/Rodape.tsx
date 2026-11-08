import Link from "next/link";
import { LOJAS } from "@/lib/lojas";
import { MODO_REAL } from "@/lib/modo";

export function Rodape() {
  return (
    <footer className="mt-16 bg-texto text-white">
      <div className="mx-auto grid max-w-[1500px] gap-10 px-6 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-3">
          <p className="titulao text-4xl tracking-[0.18em]">SELETO</p>
          <p className="max-w-xs text-sm text-white/70">Tênis, roupas e acessórios das melhores marcas. Entregamos para todo o Brasil.</p>
        </div>
        <Col titulo="Comprar">
          <li><Link href="/produtos?ordem=novo" className="hover:text-white">Novidades</Link></li>
          <li><Link href="/produtos?promo=1&ordem=promo" className="hover:text-white">Ofertas</Link></li>
          <li><Link href="/produtos" className="hover:text-white">Todos os produtos</Link></li>
          <li><Link href="/conta" className="hover:text-white">Meu cashback</Link></li>
        </Col>
        <Col titulo="Nossas lojas">
          {LOJAS.map((l) => (
            <li key={l.id}>{l.nome}</li>
          ))}
        </Col>
        <Col titulo="Ajuda">
          <li>Entregamos para todo o Brasil</li>
          <li><Link href="/trocas" className="hover:text-white">Trocas e devoluções</Link></li>
          <li><Link href="/privacidade" className="hover:text-white">Política de privacidade</Link></li>
        </Col>
      </div>
      <div className="border-t border-white/15 px-6 py-5 text-center text-xs text-white/50">
        {MODO_REAL ? "© Seleto. Todos os direitos reservados." : "© Seleto — ambiente de teste. Pedidos e pagamentos são só de exemplo."}
      </div>
    </footer>
  );
}

function Col({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-3 text-xs font-black uppercase tracking-[0.2em]">{titulo}</p>
      <ul className="space-y-2 text-sm text-white/70">{children}</ul>
    </div>
  );
}
