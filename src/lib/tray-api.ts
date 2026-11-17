/**
 * "API Tray" do site para o PDVNet: autenticação, status, pedidos liberados, atualização de status e nota fiscal.
 * Só devolve pedidos que o admin LIBEROU. Tudo atrás de token assinado. O banco entra por `BancoTray` (testável sem banco).
 */
import { credenciaisOk, respostaDeAuth, tokenValido, type ConfigTray } from "./tray-auth";
import { STATUS_DE_CAPTURA } from "./tray-captura";
import type { BancoTray } from "./tray-banco";
import { achatarCorpo, campo, lerNota, montarPedido, pedidoNaoEncontrado, statusTray, type LinhaPedido } from "./tray-pedidos";

export interface PedidoHttp {
  metodo: string;
  caminho: string; // sem o prefixo /web_api, ex.: "orders/12/complete"
  query: URLSearchParams;
  corpo: string;
  origem: string;
}

export interface RespostaHttp {
  status: number;
  json: unknown;
}

const ok = (json: unknown, status = 200): RespostaHttp => ({ status, json });
const naoAutorizado = (): RespostaHttp => ok({ code: 401, message: "Unauthorized", causes: ["Credenciais ou token inválidos."] }, 401);
const naoEncontrado = (): RespostaHttp => ok(pedidoNaoEncontrado(), 404);
const LIMITE_MAX = 50;

const paginar = <T,>(lista: T[], pagina: number, limite: number) => ({
  paging: { total: lista.length, page: pagina, offset: (pagina - 1) * limite, limit: limite, maxLimit: LIMITE_MAX },
  itens: lista.slice((pagina - 1) * limite, pagina * limite),
});

const inteiro = (v: string | null, padrao: number, min: number, max: number) => {
  const n = Math.floor(Number(v));
  return Number.isFinite(n) && n >= min ? Math.min(n, max) : padrao;
};

/** Datas aaaa-mm-dd achadas num filtro "modified" (uma = "a partir de", duas = intervalo). */
export function datasDoFiltro(v: string | null): { de: string | null; ate: string | null } {
  const d = (v ?? "").match(/\d{4}-\d{2}-\d{2}/g) ?? [];
  return { de: d[0] ?? null, ate: d[1] ?? null };
}

const dataBr = (d: Date) => new Date(d.getTime() - 3 * 3_600_000).toISOString().slice(0, 10);

/** Filtra os pedidos liberados pelos parâmetros da Tray (id, status por id ou nome, modified). */
export function filtrar(linhas: LinhaPedido[], q: URLSearchParams): LinhaPedido[] {
  const id = q.get("id");
  const statuses = (q.get("status") ?? "")
    .split(/[,;|]/)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  const { de, ate } = datasDoFiltro(q.get("modified"));
  return linhas.filter((r) => {
    if (id && r.numero !== String(Math.floor(Number(id)))) return false;
    if (statuses.length) {
      const s = statusTray(r);
      if (!statuses.includes(s.id) && !statuses.includes(s.status.toLowerCase())) return false;
    }
    const mod = dataBr(r.atualizado_em);
    if (de && mod < de) return false;
    if (ate && mod > ate) return false;
    return true;
  });
}

export async function tratarTray(req: PedidoHttp, cfg: ConfigTray, banco: BancoTray, agoraMs = Date.now()): Promise<RespostaHttp> {
  const partes = req.caminho.replace(/^\/+|\/+$/g, "").split("/").filter(Boolean);
  const [recurso, a, b, c] = partes;
  const corpo = req.metodo === "GET" ? {} : achatarCorpo(req.corpo);

  if (recurso === "auth" && partes.length === 1) {
    if (req.metodo === "POST") {
      const e = { key: campo(corpo, "consumer_key"), secret: campo(corpo, "consumer_secret"), code: campo(corpo, "code") };
      return credenciaisOk(cfg, e) ? ok(respostaDeAuth(cfg, req.origem, agoraMs)) : naoAutorizado();
    }
    if (req.metodo === "GET" && tokenValido(cfg, req.query.get("refresh_token"), "r", agoraMs)) return ok(respostaDeAuth(cfg, req.origem, agoraMs));
    return naoAutorizado();
  }

  const token = req.query.get("access_token") ?? campo(corpo, "access_token");
  if (!tokenValido(cfg, token, "a", agoraMs)) return naoAutorizado();
  if (recurso !== "orders") return naoEncontrado();

  const pagina = inteiro(req.query.get("page"), 1, 1, 10_000);
  const limite = inteiro(req.query.get("limit"), 30, 1, LIMITE_MAX);

  if (req.metodo === "GET" && a === "statuses" && partes.length === 2) {
    const lista = STATUS_DE_CAPTURA.map((s) => ({ OrderStatus: { id: s.id, status: s.status, default: "0", description: "", show_status: "1" } }));
    const p = paginar(lista, pagina, LIMITE_MAX);
    return ok({ paging: p.paging, OrderStatuses: p.itens });
  }

  if (req.metodo === "GET" && partes.length === 1) {
    const linhas = filtrar(await banco.liberados(), req.query);
    const p = paginar(linhas, pagina, limite);
    return ok({ paging: p.paging, sort: [{ id: "desc" }], availableFilters: ["id", "status", "modified"], appliedFilters: [], Orders: p.itens.map((r) => montarPedido(r, [], [], false)) });
  }

  const numero = Math.floor(Number(a));
  if (!(numero > 0)) return naoEncontrado();

  if (req.metodo === "GET" && (partes.length === 2 || (partes.length === 3 && b === "complete"))) {
    const r = await banco.liberado(numero);
    if (!r) return naoEncontrado();
    const itens = await banco.itens(numero);
    const variacoes = await banco.variacoes([...new Set(itens.map((i) => i.produto_ref))]);
    await banco.marcarBaixado(numero);
    return ok(montarPedido(r, itens, variacoes, true));
  }

  if (req.metodo === "PUT" && partes.length === 2) {
    const sid = (campo(corpo, "status_id") ?? "").replace(/\D/g, "");
    if (!sid) return ok({ code: 400, message: "Bad Request", causes: ["status_id ausente."] }, 400);
    return (await banco.gravarStatus(numero, sid)) ? ok({ code: 200, message: "Success", id: String(numero) }) : naoEncontrado();
  }

  if (b === "invoices" && ((req.metodo === "POST" && partes.length === 3) || (req.metodo === "PUT" && partes.length === 4))) {
    const nota = lerNota(corpo);
    if (!nota.numero && !nota.chave) return ok({ code: 400, message: "Bad Request", causes: ["Número ou chave da nota ausente (a chave tem 44 dígitos)."] }, 400);
    void c;
    return (await banco.gravarNota(numero, nota)) ? ok({ code: req.metodo === "POST" ? 201 : 200, message: req.metodo === "POST" ? "Created" : "Success", id: String(numero) }, req.metodo === "POST" ? 201 : 200) : naoEncontrado();
  }

  return naoEncontrado();
}
