export const reais = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/** Só dígitos. */
export const digitos = (s: string) => s.replace(/\D/g, "");

/** (21) 99999-9999 */
export function telefoneBonito(s: string): string {
  const d = digitos(s).slice(-11);
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return s;
}

export const dataBr = (iso: string) => {
  const [a, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${a}`;
};
