/** Conferência de nome na ligação da conta com o cadastro da Seleto (compara só o primeiro nome, sem acento nem maiúscula). */

const limpar = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z\s]/g, " ").trim();

export const primeiroNomeNormalizado = (s: string) => limpar(s).split(/\s+/)[0] ?? "";

/**
 * Verdadeiro se os primeiros nomes são iguais, ou se um é começo do outro com 3+ letras (ex.: "Vic" e "Victor").
 * Isto barra o erro comum (CPF de outra pessoa, nome trocado), mas NÃO prova quem é a pessoa: a prova de verdade
 * é o código por WhatsApp, que ainda não existe.
 */
export function mesmoPrimeiroNome(informado: string, cadastro: string): boolean {
  const a = primeiroNomeNormalizado(informado);
  const b = primeiroNomeNormalizado(cadastro);
  if (!a || !b) return false;
  if (a === b) return true;
  const [curto, longo] = a.length <= b.length ? [a, b] : [b, a];
  return curto.length >= 3 && longo.startsWith(curto);
}

/**
 * Nome completo: o primeiro nome confere (como em `mesmoPrimeiroNome`) E o último sobrenome é igual.
 * Nomes do meio não contam ("Maria Souza" confere com "MARIA APARECIDA SOUZA"). Exige 2+ palavras no que a pessoa digitou.
 */
export function mesmoNomeCompleto(informado: string, cadastro: string): boolean {
  const a = limpar(informado).split(/\s+/).filter(Boolean);
  const b = limpar(cadastro).split(/\s+/).filter(Boolean);
  if (a.length < 2 || b.length < 2) return false;
  return mesmoPrimeiroNome(a[0], b[0]) && a[a.length - 1] === b[b.length - 1];
}

/** "MARIA APARECIDA SOUZA" -> "Maria Aparecida Souza" (para mostrar à própria pessoa). */
export const nomeBonito = (s: string) =>
  s.toLowerCase().replace(/(^|\s)(\p{L})/gu, (_, e: string, c: string) => e + c.toUpperCase()).replace(/\s+/g, " ").trim();
