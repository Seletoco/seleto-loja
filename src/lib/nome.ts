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
