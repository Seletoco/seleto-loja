/** Preenchimento do nome no passo de ligar a conta: o servidor só revela o PRIMEIRO nome do cadastro; o resto o cliente digita. */
export function nomeParaPreencher(atual: string, primeiroDoCadastro: string): string {
  const palavras = atual.trim().split(/\s+/).filter(Boolean);
  if (palavras.length >= 2) return atual; // já digitou nome e sobrenome: não mexe
  return `${primeiroDoCadastro} `;
}
