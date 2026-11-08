/** Lojas físicas (id = loja_id do PDVNet) — retirada na loja. */
export const LOJAS = [
  { id: 14, nome: "Américas" },
  { id: 13, nome: "Aerotown" },
  { id: 15, nome: "Nova Iguaçu" },
  { id: 3, nome: "Taquara" },
] as const;

/** Links de contato (configuráveis na Vercel, sem número no código): WhatsApp de cada loja e a página de avaliação no Google. */
const WHATS: Record<number, string | undefined> = {
  3: process.env.NEXT_PUBLIC_WHATSAPP_TAQUARA,
  13: process.env.NEXT_PUBLIC_WHATSAPP_AEROTOWN,
  14: process.env.NEXT_PUBLIC_WHATSAPP_AMERICAS,
  15: process.env.NEXT_PUBLIC_WHATSAPP_NOVA_IGUACU,
};
export const NOME_PARA_ID: Record<string, number> = { Taquara: 3, Aerotown: 13, Américas: 14, "Nova Iguaçu": 15 };
/** WhatsApp único do atendimento geral (Seleto Store). Se estiver definido, vale para todas as lojas; senão usa o de cada loja. */
const WHATS_GERAL = process.env.NEXT_PUBLIC_WHATSAPP_SELETO;
export const linkWhatsappDaLoja = (nome: string, texto: string): string | null => {
  const n = (WHATS_GERAL || WHATS[NOME_PARA_ID[nome]] || "").replace(/\D/g, "");
  return n.length >= 10 ? `https://wa.me/${n.startsWith("55") ? n : `55${n}`}?text=${encodeURIComponent(texto)}` : null;
};
/** Link do WhatsApp geral de atendimento (só existe se NEXT_PUBLIC_WHATSAPP_SELETO estiver definido). */
export const linkWhatsappGeral = (texto: string): string | null => {
  const n = (WHATS_GERAL || "").replace(/\D/g, "");
  return n.length >= 10 ? `https://wa.me/${n.startsWith("55") ? n : `55${n}`}?text=${encodeURIComponent(texto)}` : null;
};
export const LINK_AVALIACAO_GOOGLE = process.env.NEXT_PUBLIC_GOOGLE_AVALIACAO_URL || null;
