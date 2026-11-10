/**
 * Gênero do produto. O sistema (PDVNet) não guarda esse dado; só dá para saber quando o nome ou o tipo do produto diz
 * ("Fem.", "Masc.", babylook, top, saia, vestido, cueca...). Por isso as listas por gênero podem estar incompletas
 * até as lojas marcarem o gênero no sistema.
 */
export type Genero = "feminino" | "masculino";

const semAcento = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

const FEMININO = /\b(fem|feminino|feminina|babylook|baby look|saia|vestido|cropped|biquini)\b|^top\b/;
const MASCULINO = /\b(masc|masculino|masculina|sunga)\b|^cueca\b/;

export function generoDe(nome: string): Genero | null {
  const t = semAcento(nome).replace(/[.,]/g, " ");
  const f = FEMININO.test(t);
  const m = MASCULINO.test(t);
  if (f === m) return null; // nenhum sinal, ou sinais contraditórios
  return f ? "feminino" : "masculino";
}

export const ehGenero = (v: unknown): v is Genero => v === "feminino" || v === "masculino";
