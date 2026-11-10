/**
 * Texto do catálogo que vem do banco (PDVNet) para o texto que o cliente lê. Funções puras (testáveis).
 * O banco guarda nomes internos ("VR27 BABYLOOK FARM...", "PERM BONE NIKE...", "INV26 TÊNIS...") em MAIÚSCULAS;
 * aqui saem os códigos de coleção e o texto vira "Título".
 */

const semAcento = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "");

/** Códigos de coleção no começo do nome: VR27, INV26, VERAO26, PERM, BST / BST 10, COPA 26. */
const PREFIXO = /^(?:(?:VR|INV|AV|OUT|PRI|VERAO|VER)\d{2}|PERM|BST\s*\d{0,2}|COPA\s*\d{2})\s+/i;

const MINUSCULAS = new Set(["de", "da", "do", "das", "dos", "e", "com", "para", "em", "a", "o"]);
/** Palavras sem acento no banco que merecem acento na vitrine. */
const COM_ACENTO: Record<string, string> = { tenis: "Tênis", bone: "Boné", calca: "Calça", calcas: "Calças", acessorios: "Acessórios", oculos: "Óculos", cadarco: "Cadarço" };

/** "VR25 TENIS ADIDAS CAMPUS 00S" -> "Tênis Adidas Campus 00S". Siglas curtas e códigos com número ficam em maiúsculas. */
export function bonitoTexto(texto: string, opcoes: { siglaAte?: number } = {}): string {
  const siglaAte = opcoes.siglaAte ?? 2;
  return texto
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .map((tok, i) => {
      const baixo = tok.toLowerCase();
      const chave = semAcento(baixo);
      if (COM_ACENTO[chave]) return COM_ACENTO[chave];
      if (i > 0 && MINUSCULAS.has(baixo)) return baixo;
      if (/\d/.test(tok)) return tok.toUpperCase(); // 00S, 920, FS5, 1609ER, 5PANEL
      if (/^\p{L}+$/u.test(tok) && tok.length <= siglaAte && !MINUSCULAS.has(baixo)) return tok.toUpperCase(); // BB, XS, FB
      return baixo.charAt(0).toUpperCase() + baixo.slice(1);
    })
    .join(" ");
}

/** Tira os códigos de coleção do começo e arruma o texto. Se sobrar nada, devolve o nome original arrumado. */
export function limparNome(nome: string): string {
  let n = nome.replace(/\s+/g, " ").trim();
  for (let i = 0; i < 3; i++) {
    const sem = n.replace(PREFIXO, "");
    if (sem === n) break;
    n = sem;
  }
  return bonitoTexto(n.length >= 2 ? n : nome);
}

export const bonitoCor = (cor: string | null | undefined): string => (cor ? bonitoTexto(cor) : "");

/** "ADIDAS" -> "Adidas", "THUG NINE" -> "Thug Nine", "FDL" -> "FDL", "SEM MARCA" -> "Outros". */
export function bonitoMarca(marca: string | null | undefined): string {
  const m = (marca ?? "").trim();
  if (!m || /^sem marca$/i.test(m)) return "Outros";
  // Marca de uma palavra só e curta é sigla (FDL, BAW); em nome composto ("Alma de Sal") só vale sigla de 2 letras.
  return bonitoTexto(m, { siglaAte: m.includes(" ") ? 2 : 3 });
}

/** Grupo do PDVNet -> categoria da vitrine. O que não casa vira "Outros". */
export function categoriaDoSite(grupo: string | null | undefined): string {
  const g = semAcento(String(grupo ?? "")).toUpperCase();
  if (/\bTENIS\b|CHUTEIRA/.test(g)) return "Tênis";
  if (/CHINELO|SLIDE|SANDALIA/.test(g)) return "Chinelos";
  if (/\bBONE\b|VISEIRA|CHAPEU|TOUCA/.test(g)) return "Bonés";
  if (/CASACO|MOLETOM|JAQUETA|BLUSAO|CORTA ?VENTO|COLETE/.test(g)) return "Casacos e Moletons";
  if (/CALCA|LEGGING|JOGGER|CALCAO/.test(g)) return "Calças";
  if (/SHORT|BERMUDA/.test(g)) return "Shorts";
  if (/CAMISA|CAMISETA|REGATA|BABY ?LOOK|\bTOP\b|POLO|CROPPED|\bBODY\b/.test(g)) return "Camisetas";
  if (/BOLSA|BOLSINHA|MOCHILA|NECESSAR|LANCHEIRA|TOTEBAG|CARTEIRA|POCHETE|ESTOJO|SHOULDER/.test(g)) return "Bolsas e Mochilas";
  return "Outros";
}

const ORDEM_LETRAS = ["PP", "P", "M", "G", "GG", "XG", "XGG", "G1", "G2", "G3", "U", "UN", "UNICO"];
/** Números do menor para o maior; letras na ordem de roupa (P, M, G, GG...); o resto em ordem alfabética. */
export function ordenarTamanhos(tamanhos: string[]): string[] {
  const unicos = [...new Set(tamanhos.map((t) => t.trim()).filter(Boolean))];
  return unicos.sort((a, b) => {
    const na = Number(a.replace(",", "."));
    const nb = Number(b.replace(",", "."));
    if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
    const ia = ORDEM_LETRAS.indexOf(a.toUpperCase());
    const ib = ORDEM_LETRAS.indexOf(b.toUpperCase());
    if (ia >= 0 && ib >= 0) return ia - ib;
    if (ia >= 0) return -1;
    if (ib >= 0) return 1;
    return a.localeCompare(b, "pt-BR");
  });
}
