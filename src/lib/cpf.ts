/** Utilidades de CPF que rodam no navegador e no servidor. O CPF nunca é gravado nem registrado em log. */

export const soDigitos = (s: string) => s.replace(/\D/g, "");

/** 11 dígitos, não repetidos (111.111.111-11 etc.) e com os dois dígitos verificadores corretos. */
export function cpfValido(entrada: string): boolean {
  const d = soDigitos(entrada);
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  const digito = (base: string, pesoInicial: number) => {
    let soma = 0;
    for (let i = 0; i < base.length; i++) soma += Number(base[i]) * (pesoInicial - i);
    const r = (soma * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return digito(d.slice(0, 9), 10) === Number(d[9]) && digito(d.slice(0, 10), 11) === Number(d[10]);
}

/** 52998224725 -> 529.982.247-25 (aceita digitação parcial). */
export function formatarCpf(entrada: string): string {
  const d = soDigitos(entrada).slice(0, 11);
  return d
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d)/, "$1.$2.$3-$4");
}
