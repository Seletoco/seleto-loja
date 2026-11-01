/** Banner de topo: entrega para todo o Brasil. É um desenho em SVG/CSS, sem arquivo de imagem. */
export function FaixaEntrega() {
  return (
    <section
      aria-label="Entregamos para todo o Brasil"
      className="relative overflow-hidden rounded-xl bg-gradient-to-r from-[#111] via-[#1d1d1d] to-[#2b2b2b] px-6 py-8 text-white sm:px-10 sm:py-10"
    >
      <svg aria-hidden className="pointer-events-none absolute -right-6 -top-6 h-64 w-64 opacity-[0.07]" viewBox="0 0 100 100" fill="none" stroke="white" strokeWidth="1.5">
        <circle cx="50" cy="50" r="46" />
        <ellipse cx="50" cy="50" rx="20" ry="46" />
        <path d="M4 50h92M10 28h80M10 72h80" />
      </svg>
      <div className="relative flex flex-col items-start gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="max-w-xl space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/60">Seleto online</p>
          <h1 className="text-3xl font-black leading-tight sm:text-5xl">
            Entregamos para <span className="text-[#f2d45c]">todo o Brasil</span>
          </h1>
          <p className="text-sm text-white/75 sm:text-base">
            Escolha no site e receba onde estiver. Se preferir, retire em uma das nossas lojas.
          </p>
        </div>
        <svg aria-hidden viewBox="0 0 120 70" className="h-20 w-36 shrink-0 sm:h-28 sm:w-52" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 14h62v34H6z" />
          <path d="M68 24h26l16 16v8H68z" />
          <circle cx="26" cy="52" r="7" fill="#111" />
          <circle cx="92" cy="52" r="7" fill="#111" />
          <path d="M14 28h24M14 36h16" opacity="0.6" />
        </svg>
      </div>
      <ul className="relative mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/85">
        <li>✓ Envio para todos os estados</li>
        <li>✓ Frete e prazo confirmados no pedido</li>
        <li>✓ Troca fácil nas lojas</li>
      </ul>
    </section>
  );
}
