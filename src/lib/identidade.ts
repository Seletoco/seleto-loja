/** Conferência de identidade: o que a pessoa digitou precisa bater com o cadastro da Seleto. Funções puras (testáveis). */
import { mesmoNomeCompleto } from "./nome";

/** Aceita "AAAA-MM-DD" (campo de data) ou "DD/MM/AAAA". Devolve "AAAA-MM-DD" válido ou null. */
export function nascimentoIso(texto: unknown): string | null {
  const t = String(texto ?? "").trim();
  let a: string, m: string, d: string;
  let g = /^(\d{4})-(\d{2})-(\d{2})$/.exec(t);
  if (g) [, a, m, d] = g;
  else if ((g = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(t))) [, d, m, a] = g;
  else return null;
  const data = new Date(Date.UTC(Number(a), Number(m) - 1, Number(d)));
  if (data.getUTCFullYear() !== Number(a) || data.getUTCMonth() !== Number(m) - 1 || data.getUTCDate() !== Number(d)) return null;
  if (Number(a) < 1900 || data.getTime() > Date.now()) return null;
  return `${a}-${m}-${d}`;
}

export interface DadosInformados {
  nome: string;
  nascimento: string | null; // AAAA-MM-DD já validado por nascimentoIso
}
export interface DadosDoCadastro {
  nome: string;
  nascimento: string | null; // AAAA-MM-DD
}

/** Nome completo E data de nascimento iguais aos do cadastro. Cadastro sem nascimento nunca confere (não dá para provar). */
export function confereIdentidade(inf: DadosInformados, cad: DadosDoCadastro): boolean {
  if (!inf.nascimento || !cad.nascimento) return false;
  return inf.nascimento === cad.nascimento && mesmoNomeCompleto(inf.nome, cad.nome);
}
