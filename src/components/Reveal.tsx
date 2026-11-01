"use client";

import { useEffect, useRef } from "react";

/**
 * Faz o bloco surgir suavemente ao entrar na tela.
 * Melhoria progressiva: sem JavaScript (ou se algo falhar) o bloco fica VISÍVEL; só esconde
 * o que está abaixo da dobra depois que o navegador já carregou.
 */
export function Reveal({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (el.getBoundingClientRect().top < window.innerHeight) return; // já está na tela
    el.classList.add("revelar");
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          el.classList.add("visivel");
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.01 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
