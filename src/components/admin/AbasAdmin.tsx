"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ABAS: [string, string][] = [
  ["/admin", "Resumo"],
  ["/admin/pedidos", "Pedidos"],
  ["/admin/clientes", "Clientes"],
  ["/admin/catalogo", "Catálogo"],
  ["/admin/pagamentos", "Pagamentos"],
  ["/admin/configuracoes", "Configurações"],
];

export function AbasAdmin() {
  const rota = usePathname();
  return (
    <nav className="-mx-4 flex gap-1 overflow-x-auto border-b border-borda px-4 print:hidden" aria-label="Seções do painel">
      {ABAS.map(([href, rotulo]) => {
        const ativo = href === "/admin" ? rota === "/admin" : rota.startsWith(href);
        return (
          <Link key={href} href={href} className={`whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-bold uppercase tracking-wide ${ativo ? "border-texto" : "border-transparent text-fraco hover:text-texto"}`}>
            {rotulo}
          </Link>
        );
      })}
    </nav>
  );
}
