/** Serializa dados estruturados (JSON-LD) para uma tag <script>, escapando "<" para o texto nunca fechar a tag. */
export const jsonLd = (dados: unknown): string => JSON.stringify(dados).replace(/</g, "\\u003c");
