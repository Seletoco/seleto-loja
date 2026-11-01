"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { Produto } from "@/lib/tipos";
import { reais } from "@/lib/format";

export interface Slide {
  etiqueta: string;
  titulo: string; // aceita \n
  texto: string;
  cta: string;
  href: string;
  produto: Produto | null;
  fundo: string; // classe do fundo
  escuro?: boolean;
}

/** Hero em tela cheia: texto gigante em caixa alta + foto do produto "vazando" para fora do quadro. */
export function Hero({ slides }: { slides: Slide[] }) {
  const [i, setI] = useState(0);
  const [pausado, setPausado] = useState(false);
  const n = slides.length;
  const ir = useCallback((k: number) => setI(((k % n) + n) % n), [n]);

  useEffect(() => {
    if (pausado || n < 2) return;
    const t = setInterval(() => setI((x) => (x + 1) % n), 6000);
    return () => clearInterval(t);
  }, [pausado, n]);

  return (
    <section
      className="relative overflow-hidden"
      onMouseEnter={() => setPausado(true)}
      onMouseLeave={() => setPausado(false)}
      aria-roledescription="carrossel"
      aria-label="Destaques"
    >
      <div className="flex transition-transform duration-700 ease-out" style={{ transform: `translateX(-${i * 100}%)` }}>
        {slides.map((s, idx) => (
          <div key={s.titulo} className={`relative min-h-[460px] min-w-full sm:min-h-[560px] ${s.fundo} ${s.escuro ? "text-white" : "text-texto"}`} aria-hidden={idx !== i}>
            <div className="mx-auto grid h-full max-w-[1500px] items-center gap-6 px-6 py-10 sm:grid-cols-[1.1fr_1fr] sm:px-12">
              <div className="relative z-10 space-y-5">
                <span className={`inline-block px-3 py-1 text-xs font-black uppercase tracking-[0.2em] ${s.escuro ? "bg-destaque text-texto" : "bg-texto text-white"}`}>{s.etiqueta}</span>
                <h1 className="titulao whitespace-pre-line text-[clamp(2.6rem,8vw,6.5rem)]">{s.titulo}</h1>
                <p className={`max-w-md text-base sm:text-lg ${s.escuro ? "text-white/80" : "text-texto/70"}`}>{s.texto}</p>
                <Link href={s.href} tabIndex={idx === i ? 0 : -1} className={`inline-flex items-center gap-2 px-8 py-4 text-sm font-black uppercase tracking-wide transition ${s.escuro ? "bg-white text-texto hover:bg-destaque" : "bg-texto text-white hover:bg-white hover:text-texto hover:outline hover:outline-1 hover:outline-texto"}`}>
                  {s.cta} →
                </Link>
              </div>
              <div className="relative flex h-64 items-center justify-center sm:h-[460px]">
                {s.produto?.foto ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element -- fotos vêm do catálogo */}
                    <img src={s.produto.foto} alt={s.produto.nome} className={`size-full object-contain drop-shadow-2xl ${s.escuro ? "rounded-md bg-white p-4" : "foto-produto"}`} />
                    <div className="absolute bottom-2 right-2 bg-white px-3 py-2 text-texto shadow-lg sm:bottom-6 sm:right-6">
                      <p className="line-clamp-1 max-w-48 text-xs font-bold">{s.produto.nome}</p>
                      <p className="text-sm font-black">{reais(s.produto.preco)}</p>
                    </div>
                  </>
                ) : (
                  <Caminhao />
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <button onClick={() => ir(i - 1)} aria-label="Anterior" className="absolute left-3 top-1/2 hidden size-12 -translate-y-1/2 items-center justify-center bg-white text-xl shadow sm:flex">‹</button>
      <button onClick={() => ir(i + 1)} aria-label="Próximo" className="absolute right-3 top-1/2 hidden size-12 -translate-y-1/2 items-center justify-center bg-white text-xl shadow sm:flex">›</button>
      <div className="absolute bottom-4 left-6 flex gap-2 sm:left-12">
        {slides.map((s, k) => (
          <button key={s.titulo} onClick={() => ir(k)} aria-label={`Slide ${k + 1}`} className="group py-2">
            <span className={`block h-1 transition-all ${slides[i].escuro ? (k === i ? "w-12 bg-white" : "w-6 bg-white/40 group-hover:bg-white/70") : (k === i ? "w-12 bg-texto" : "w-6 bg-texto/30 group-hover:bg-texto/60")}`} />
          </button>
        ))}
      </div>
    </section>
  );
}

function Caminhao() {
  return (
    <svg viewBox="0 0 200 120" className="h-full w-full max-w-md" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M10 22h104v62H10z" />
      <path d="M114 40h44l30 30v14H114z" />
      <circle cx="44" cy="92" r="12" fill="#111" />
      <circle cx="154" cy="92" r="12" fill="#111" />
      <path d="M24 42h50M24 56h34" opacity=".5" />
    </svg>
  );
}
