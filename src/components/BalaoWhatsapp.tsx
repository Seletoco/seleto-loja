"use client";

import { usePathname } from "next/navigation";

/** Balão fixo no canto da tela que abre o WhatsApp da Seleto. O link é montado no servidor (layout) e só existe com o número configurado. */
export function BalaoWhatsapp({ href }: { href: string }) {
  const rota = usePathname();
  if (rota.startsWith("/admin")) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Fale com a Seleto no WhatsApp"
      className="fixed bottom-4 right-4 z-40 flex items-center gap-2 rounded-full bg-[#25D366] px-4 py-3 text-sm font-bold text-white shadow-lg transition hover:scale-105 hover:bg-[#1ebe5a] sm:bottom-6 sm:right-6"
    >
      <svg viewBox="0 0 24 24" className="size-6 fill-none stroke-current" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M21 11.5a8.4 8.4 0 0 1-12.4 7.4L3 21l2.1-5.4A8.4 8.4 0 1 1 21 11.5z" />
        <path d="M9 9.5c0 3 2.500 5.500 5.500 5.500l1.300-1.300-2-1-.8.8c-.9-.4-1.700-1.200-2.100-2.100l.8-.8-1-2z" />
      </svg>
      <span className="hidden sm:inline">Fale com a gente</span>
    </a>
  );
}
