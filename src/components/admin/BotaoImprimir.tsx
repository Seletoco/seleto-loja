"use client";

export function BotaoImprimir() {
  return (
    <button type="button" onClick={() => window.print()} className="btn !px-4 !py-2 !text-xs print:hidden">
      Imprimir
    </button>
  );
}
