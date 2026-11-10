"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const CHAVE = "seleto-loja:popup-entrada-visto";
/** Páginas em que o popup NÃO aparece (o cliente está no meio de uma tarefa). */
const SEM_POPUP = ["/checkout", "/carrinho", "/pedido", "/admin", "/conta"];

/**
 * Popup que abre assim que o cliente entra no site (uma vez por visita, lembrado na aba).
 * PRÉVIA: sem preço, desconto nem data inventados. Quem decide se aparece é o servidor (ver `blackFridayAtiva`).
 */
export function PopupEntrada() {
  const caminho = usePathname();
  const [aberto, setAberto] = useState(false);
  const fechar = useRef<HTMLButtonElement>(null);
  const bloqueado = SEM_POPUP.some((p) => caminho === p || caminho.startsWith(p + "/"));

  useEffect(() => {
    if (bloqueado) return;
    let visto = false;
    try {
      visto = sessionStorage.getItem(CHAVE) === "1";
    } catch {
      /* sem armazenamento: mostra uma vez por carregamento */
    }
    if (visto) return;
    const t = setTimeout(() => setAberto(true), 900);
    return () => clearTimeout(t);
  }, [bloqueado]);

  useEffect(() => {
    if (!aberto) return;
    fechar.current?.focus();
    const tecla = (e: KeyboardEvent) => e.key === "Escape" && encerrar();
    window.addEventListener("keydown", tecla);
    const antes = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", tecla);
      document.body.style.overflow = antes;
    };
  }, [aberto]);

  function encerrar() {
    setAberto(false);
    try {
      sessionStorage.setItem(CHAVE, "1");
    } catch {
      /* ignora */
    }
  }

  if (!aberto) return null;
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4" onClick={encerrar}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="popup-titulo"
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg overflow-hidden bg-white shadow-2xl"
      >
        <div className="bg-texto px-8 pb-10 pt-8 text-white">
          <span className="relative inline-block rounded-xl bg-destaque px-3 py-1 text-xs font-black uppercase tracking-wider text-texto">
            Black Friday
            <span aria-hidden className="absolute -bottom-1 left-4 size-2.5 rotate-45 bg-destaque" />
          </span>
          <h2 id="popup-titulo" className="titulao mt-5 text-4xl sm:text-5xl">As melhores ofertas do ano estão chegando</h2>
        </div>
        <div className="space-y-4 p-8">
          <p className="text-sm text-fraco">
            Crie sua conta Seleto e entre na lista VIP: quem está na lista recebe as ofertas e os lançamentos primeiro, e ainda acompanha o cashback e o nível.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Link href="/conta?aba=vantagens" onClick={encerrar} className="btn flex-1 text-center">Criar minha conta</Link>
            <button ref={fechar} type="button" onClick={encerrar} className="btn-claro flex-1">Agora não</button>
          </div>
        </div>
        <button type="button" aria-label="Fechar" onClick={encerrar} className="absolute right-3 top-2 px-2 py-1 text-2xl leading-none text-white/70 hover:text-white">×</button>
      </div>
    </div>
  );
}
