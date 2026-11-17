/** Peças visuais simples do painel (servidor ou cliente). */
export function Numero({ rotulo, valor, detalhe, destaque }: { rotulo: string; valor: string; detalhe?: string; destaque?: boolean }) {
  return (
    <div className={`border p-4 ${destaque ? "border-texto bg-texto text-white" : "border-borda bg-painel"}`}>
      <p className={`text-xs font-bold uppercase tracking-widest ${destaque ? "text-white/70" : "text-fraco"}`}>{rotulo}</p>
      <p className="mt-1 text-2xl font-black">{valor}</p>
      {detalhe ? <p className={`mt-0.5 text-xs ${destaque ? "text-white/70" : "text-fraco"}`}>{detalhe}</p> : null}
    </div>
  );
}

export function Secao({ titulo, children, acao }: { titulo: string; children: React.ReactNode; acao?: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between gap-3">
        <h2 className="text-sm font-black uppercase tracking-widest">{titulo}</h2>
        {acao}
      </div>
      {children}
    </section>
  );
}

export function Vazio({ children }: { children: React.ReactNode }) {
  return <p className="border border-borda bg-painel p-6 text-center text-sm text-fraco">{children}</p>;
}

export const ROTULO_STATUS: Record<string, string> = {
  aguardando_pagamento: "Aguardando pagamento",
  pago: "Pago",
  em_separacao: "Em separação",
  pronto_retirada: "Pronto para retirada",
  enviado: "Enviado",
  entregue: "Entregue",
  cancelado: "Cancelado",
};
