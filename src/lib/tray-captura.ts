/**
 * MODO CAPTURA da integração PDVNet ↔ site (o PDVNet tem um módulo para "TrayCommerce" com "Endereço base da loja" editável).
 * Serve só para ver, nos logs da Vercel, EXATAMENTE o que o PDVNet pede (caminhos, parâmetros, formato), antes de montar a
 * integração de verdade. Não lê nem grava nada no banco e não devolve pedido nenhum (listas vazias).
 *
 * Desligado por padrão: só responde com TRAY_CAPTURA=1 (senão 404). Valores sensíveis (secret, code, tokens, senhas) NUNCA vão para o log.
 */
const SENSIVEL = /(secret|code|token|senha|password|authorization|key|chave)/i;

/** Destinos aceitos para devolver o código de autorização: o computador local e a API do próprio PDVNet (visto nos logs de captura). Nada mais. */
export function callbackPermitido(valor: string | null): URL | null {
  try {
    const u = new URL(valor ?? "");
    if (["localhost", "127.0.0.1"].includes(u.hostname)) return u;
    if (u.protocol === "https:" && u.hostname === "pdvempresaapi.pdvnet.com.br" && u.pathname.startsWith("/api/")) return u;
  } catch {
    /* sem callback válido */
  }
  return null;
}

export const capturaLigada = (env: Record<string, string | undefined> = process.env) => env.TRAY_CAPTURA === "1";

export function ocultar(valor: unknown, profundidade = 0): unknown {
  if (profundidade > 5) return "[fundo]";
  if (Array.isArray(valor)) return valor.slice(0, 20).map((v) => ocultar(v, profundidade + 1));
  if (valor && typeof valor === "object") {
    return Object.fromEntries(Object.entries(valor as Record<string, unknown>).slice(0, 60).map(([k, v]) => [k, SENSIVEL.test(k) ? "[oculto]" : ocultar(v, profundidade + 1)]));
  }
  if (typeof valor === "string") return valor.length > 200 ? `${valor.slice(0, 200)}…` : valor;
  return valor;
}

export function paramsOcultos(url: URL): Record<string, string> {
  const o: Record<string, string> = {};
  for (const [k, v] of url.searchParams) o[k] = SENSIVEL.test(k) ? "[oculto]" : v.slice(0, 200);
  return o;
}

export async function corpoOculto(req: Request): Promise<unknown> {
  const texto = (await req.text().catch(() => "")).slice(0, 4000);
  if (!texto) return null;
  try {
    return ocultar(JSON.parse(texto));
  } catch {
    const f = new URLSearchParams(texto);
    const o: Record<string, string> = {};
    for (const [k, v] of f) o[k] = SENSIVEL.test(k) ? "[oculto]" : v.slice(0, 200);
    return Object.keys(o).length ? o : "[texto não reconhecido]";
  }
}

export async function registrar(req: Request, caminho: string): Promise<void> {
  const url = new URL(req.url);
  const cab = Object.fromEntries([...req.headers.keys()].filter((k) => !/^(x-vercel|x-forwarded|x-real|forwarded|cookie)/i.test(k)).map((k) => [k, /^(user-agent|content-type|accept)$/i.test(k) ? req.headers.get(k) : "(presente)"]));
  console.log("[tray-captura]", JSON.stringify({ metodo: req.method, caminho, query: paramsOcultos(url), cabecalhos: cab, corpo: await corpoOculto(req) }));
}

const agora = () => new Date();
const emDias = (n: number) => new Date(agora().getTime() + n * 86_400_000).toISOString().slice(0, 19).replace("T", " ");

/** Respostas mínimas no estilo da Tray, só para o PDVNet continuar chamando e a gente ver o próximo passo. */
/** Status de pedido oferecidos ao PDVNet (ids como os padrões dele: Pagos 1, Faturado 31, Confirmados 39). */
export const STATUS_DE_CAPTURA: { id: string; status: string }[] = [
  { id: "1", status: "Pago" },
  { id: "39", status: "Em separação" },
  { id: "31", status: "Faturado" },
  { id: "40", status: "Enviado" },
  { id: "41", status: "Entregue" },
  { id: "9", status: "Cancelado" },
];

const paginacao = (total: number, pagina: number) => ({ total, page: pagina, offset: 0, limit: 50, maxLimit: 50 });

export function respostaDeCaptura(metodo: string, caminho: string, origem: string, pagina = 1): { status: number; json: unknown } {
  const c = caminho.replace(/^\/+|\/+$/g, "");
  // Páginas absurdas: devolve 404 no estilo da Tray em vez de lista vazia (o PDVNet chegou a pedir 290 páginas seguidas).
  if (pagina > 3) return { status: 404, json: { code: 404, message: "Not Found", causes: ["Página inexistente."] } };
  if (c === "auth" && metodo === "POST") {
    return {
      status: 200,
      json: {
        code: 200,
        message: "OK",
        access_token: "captura",
        refresh_token: "captura",
        date_expiration_access_token: emDias(1),
        date_expiration_refresh_token: emDias(30),
        date_activated: emDias(0),
        api_host: `${origem}/web_api`,
        store_id: "1",
      },
    };
  }
  if (/^orders\/statuses$/.test(c)) {
    const lista = pagina === 1 ? STATUS_DE_CAPTURA.map((s) => ({ OrderStatus: { id: s.id, status: s.status, default: "0", description: "", show_status: "1" } })) : [];
    return { status: 200, json: { paging: paginacao(STATUS_DE_CAPTURA.length, pagina), OrderStatuses: lista } };
  }
  if (/^orders(\/|$)/.test(c) && metodo === "GET") return { status: 200, json: { paging: paginacao(0, pagina), Orders: [] } };
  return { status: 200, json: { code: 200, message: "captura" } };
}
