"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { dataBr, reais } from "@/lib/format";
import { cpfValido, formatarCpf } from "@/lib/cpf";
import { nomeParaPreencher } from "@/lib/cpf-nome";
import type { Alerta, DadosConta, Preferencias } from "@/lib/conta-tipos";
import { LINK_AVALIACAO_GOOGLE, linkWhatsappDaLoja } from "@/lib/lojas";
import { BENEFICIOS_POR_NIVEL, PORTA_DO_CLUBE } from "@/lib/vantagens";

const hoje = () => new Date(Date.now() - 3 * 3_600_000).toISOString().slice(0, 10); // dia de Brasília
const diasAte = (iso: string) => Math.round((new Date(iso + "T00:00:00Z").getTime() - new Date(hoje() + "T00:00:00Z").getTime()) / 86_400_000);
const post = (url: string, corpo: object) => fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(corpo) });

const diasDesde = (iso: string) => Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);

type Aba = "cashback" | "compras" | "vantagens" | "nivel" | "ajustes";
const ABAS: Aba[] = ["cashback", "compras", "vantagens", "nivel", "ajustes"];
/** Só roda no navegador (a área só monta depois do login), então pode ler a URL direto. */
const paramDaUrl = (nome: string) => (typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get(nome));

/** Conta por e-mail ainda sem ligação com o cadastro da Seleto. */
interface SemVinculo {
  vinculo: false;
  nome: string;
  email: string | null;
}
type Carregado = DadosConta | SemVinculo;
const semVinculo = (d: Carregado): d is SemVinculo => (d as SemVinculo).vinculo === false;

export default function Conta() {
  const [dados, setDados] = useState<DadosConta | null>(null);
  const [pendente, setPendente] = useState<SemVinculo | null>(null);
  const [verificando, setVerificando] = useState(true);

  const receber = useCallback((d: Carregado) => {
    if (semVinculo(d)) {
      setDados(null);
      setPendente(d);
    } else {
      setPendente(null);
      setDados(d);
    }
  }, []);
  async function recarregar(): Promise<boolean> {
    const r = await fetch("/api/conta/dados");
    if (!r.ok) return false;
    receber(await r.json());
    return true;
  }

  useEffect(() => {
    fetch("/api/conta/dados")
      .then(async (r) => { if (r.ok) receber(await r.json()); })
      .finally(() => setVerificando(false));
  }, [receber]);

  // Veio de outra tela (ex.: checkout) pedindo para voltar depois de entrar com a conta ligada.
  useEffect(() => {
    if (!dados) return;
    const v = new URLSearchParams(window.location.search).get("voltar");
    if (v && v.startsWith("/") && !v.startsWith("//")) window.location.assign(v);
  }, [dados]);

  async function sair() {
    await fetch("/api/conta/sair", { method: "POST" });
    setDados(null);
    setPendente(null);
  }

  if (verificando) return <p className="py-10 text-center text-fraco">Carregando…</p>;
  if (dados) return <Area dados={dados} sair={sair} />;
  if (pendente) return <Vincular pendente={pendente} aoLigar={recarregar} sair={sair} />;
  return <Login aoEntrar={receber} />;
}

function Login({ aoEntrar }: { aoEntrar: (d: Carregado) => void }) {
  return (
    <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[minmax(0,1fr)_440px] lg:items-start lg:gap-10">
      <BoasVindas titulo="Sua conta Seleto" className="hidden lg:order-first lg:block" />
      <LoginEmail aoEntrar={aoEntrar} />
    </div>
  );
}

/** Painel do lado do formulário no computador: o que a conta oferece (só o que já existe na loja). */
function BoasVindas({ titulo, className = "" }: { titulo: string; className?: string }) {
  const itens: [string, string][] = [
    ["Cashback Seleto", "Veja seu saldo, quando libera e quando vence. Use nas lojas informando seu celular no caixa."],
    ["Seu nível", "Acompanhe quanto falta para o próximo nível e o que você já conquistou."],
    ["Lista VIP", "Receba ofertas e novidades da Seleto antes de todo mundo."],
    ["Me avise quando chegar", "Peça o produto e o tamanho que você quer e avisamos quando chegar."],
  ];
  return (
    <section className={className}>
      <h2 className="titulao text-4xl xl:text-5xl">{titulo}</h2>
      <div className="mt-6 grid gap-3 xl:grid-cols-2">
        {itens.map(([t, d]) => (
          <div key={t} className="border border-borda bg-painel p-5">
            <p className="text-xs font-black uppercase tracking-widest">{t}</p>
            <p className="mt-1 text-sm text-fraco">{d}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function LoginEmail({ aoEntrar }: { aoEntrar: (d: Carregado) => void }) {
  const [criando, setCriando] = useState(false);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    setCarregando(true);
    try {
      const r = await post(criando ? "/api/conta/cadastrar" : "/api/conta/login", criando ? { nome, email, senha } : { email, senha });
      if (!r.ok) return setErro((await r.json().catch(() => ({}))).erro ?? "Não foi possível continuar.");
      const d = await fetch("/api/conta/dados");
      if (d.ok) aoEntrar(await d.json());
      else setErro("Não foi possível carregar seus dados.");
    } catch {
      setErro("Sem conexão. Tente novamente.");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <form onSubmit={enviar} className="space-y-3 rounded-xl border border-borda bg-painel p-6">
      <h1 className="text-xl font-bold">{criando ? "Criar minha conta" : "Entrar na minha conta"}</h1>
      <p className="text-sm text-fraco">
        {criando ? "Depois de criar, você liga a conta ao seu cadastro da Seleto com CPF, celular, nome completo e data de nascimento." : "Para ver seu cashback e comprar com vantagens é preciso ter conta. Entre com o e-mail e a senha que você cadastrou."}
      </p>
      {criando ? <input className="campo" placeholder="Seu nome (como está no cadastro da Seleto)" maxLength={60} value={nome} onChange={(e) => setNome(e.target.value)} autoComplete="given-name" required /> : null}
      <input className="campo" type="email" placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
      <input className="campo" type="password" placeholder={criando ? "Crie uma senha (mínimo 8 caracteres)" : "Senha"} value={senha} onChange={(e) => setSenha(e.target.value)} autoComplete={criando ? "new-password" : "current-password"} required />
      {erro ? <p className="text-sm text-promo">{erro}</p> : null}
      <button className="btn w-full" disabled={carregando}>{carregando ? "Aguarde…" : criando ? "Criar conta" : "Entrar"}</button>
      <button type="button" onClick={() => { setCriando(!criando); setErro(""); }} className="w-full text-center text-xs font-bold underline underline-offset-4">
        {criando ? "Já tenho conta" : "Ainda não tenho conta"}
      </button>
    </form>
  );
}

/** Passo 2 da conta por e-mail: liga ao cadastro da Seleto conferindo CPF + celular. */
function Vincular({ pendente, aoLigar, sair }: { pendente: SemVinculo; aoLigar: () => Promise<boolean>; sair: () => void }) {
  const [nome, setNome] = useState(pendente.nome ?? "");
  const [nascimento, setNascimento] = useState("");
  const [cpf, setCpf] = useState("");
  const [telefone, setTelefone] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [dica, setDica] = useState("");

  /** Com o CPF completo e válido, busca só o primeiro nome do cadastro para adiantar o preenchimento. */
  async function aoDigitarCpf(valor: string) {
    const formatado = formatarCpf(valor);
    setCpf(formatado);
    setDica("");
    if (!cpfValido(formatado)) return;
    try {
      const r = await post("/api/conta/cpf-nome", { cpf: formatado });
      if (!r.ok) return;
      const { primeiroNome } = (await r.json()) as { primeiroNome: string | null };
      if (primeiroNome) {
        setNome((atual) => nomeParaPreencher(atual, primeiroNome));
        setDica(`Encontramos um cadastro no nome de ${primeiroNome}. Complete com seu nome completo e confirme a data de nascimento e o celular.`);
      } else {
        setDica("Não encontramos esse CPF nas nossas lojas. Confira os números. Se você nunca comprou na Seleto, pode continuar comprando sem ligar a conta.");
      }
    } catch {
      /* sem conexão: o cliente digita tudo e o servidor confere do mesmo jeito */
    }
  }

  async function ligar(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    if (!cpfValido(cpf)) return setErro("CPF inválido. Confira os 11 números.");
    if (nome.trim().split(/\s+/).length < 2) return setErro("Informe seu nome completo, como está no cadastro da Seleto.");
    if (!nascimento) return setErro("Informe a data de nascimento.");
    setCarregando(true);
    try {
      const r = await post("/api/conta/vincular", { nome, nascimento, cpf, telefone });
      if (!r.ok) return setErro((await r.json().catch(() => ({}))).erro ?? "Não foi possível ligar a conta.");
      if (!(await aoLigar())) setErro("Ligamos, mas não foi possível carregar seus dados. Atualize a página.");
    } catch {
      setErro("Sem conexão. Tente novamente.");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[minmax(0,1fr)_440px] lg:items-start lg:gap-10">
    <BoasVindas titulo="Falta só ligar ao seu cadastro" className="hidden lg:order-first lg:block" />
    <form onSubmit={ligar} className="space-y-3 rounded-xl border border-borda bg-painel p-6">
      <h1 className="text-xl font-bold">Olá{pendente.nome ? `, ${pendente.nome}` : ""}!</h1>
      <p className="text-sm text-fraco">
        Sua conta {pendente.email ? <b className="text-texto">{pendente.email}</b> : null} foi criada. Agora ligue ao seu cadastro da Seleto para ver seu cashback e seu nível. Informe os dados do seu cadastro nas nossas lojas: nome completo, data de nascimento, CPF e celular. Tudo precisa conferir.
      </p>
      <input className="campo" placeholder="Nome completo, como está no cadastro" maxLength={120} value={nome} onChange={(e) => setNome(e.target.value)} autoComplete="name" required />
      <label className="block text-xs font-bold uppercase tracking-wide text-fraco" htmlFor="nasc">Data de nascimento</label>
      <input id="nasc" className="campo !mt-1" type="date" min="1900-01-01" max={new Date().toISOString().slice(0, 10)} value={nascimento} onChange={(e) => setNascimento(e.target.value)} autoComplete="bday" required />
      <input className="campo" placeholder="Seu CPF" inputMode="numeric" maxLength={14} value={cpf} onChange={(e) => void aoDigitarCpf(e.target.value)} autoComplete="off" required />
      {dica ? <p className="text-xs text-fraco" role="status">{dica}</p> : null}
      <input className="campo" placeholder="Celular com DDD" inputMode="tel" value={telefone} onChange={(e) => setTelefone(e.target.value)} autoComplete="tel" required />
      {erro ? <p className="text-sm text-promo" role="alert">{erro}</p> : null}
      <button className="btn w-full" disabled={carregando}>{carregando ? "Conferindo…" : "Ligar ao meu cadastro"}</button>
      <p className="text-xs text-fraco">Seu CPF é usado só para conferir o cadastro e não fica guardado.</p>
      <p className="text-xs text-fraco">
        Nunca comprou nas nossas lojas? Sua conta continua valendo para comprar no site, e o cashback aparece depois da primeira compra.{" "}
        <Link href="/produtos" className="font-bold text-texto underline underline-offset-4">Continuar comprando</Link>
      </p>
      <button type="button" onClick={sair} className="w-full text-center text-xs font-bold underline underline-offset-4">Sair</button>
    </form>
    </div>
  );
}

const COR_NIVEL: Record<string, string> = { Cliente: "#707072", Prata: "#9aa4b2", Ouro: "#d4af37", Diamante: "#7c3aed" };
const ordem = ["Cliente", "Prata", "Ouro", "Diamante"];

function Icone({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={d} />
    </svg>
  );
}
const ICONES = { cashback: "M12 2v20M17 6H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6", compras: "M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4zM3 6h18M16 10a4 4 0 0 1-8 0", vantagens: "M20 12v10H4V12M2 7h20v5H2zM12 22V7M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z", ajustes: "M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6", nivel: "M12 2l3 7 7 .6-5.3 4.7 1.6 7.2L12 17.8 5.7 21.5l1.6-7.2L2 9.6 9 9z" };

function Area({ dados, sair }: { dados: DadosConta; sair: () => void }) {
  const [aba, setAba] = useState<Aba>(() => ABAS.find((a) => a === paramDaUrl("aba")) ?? "cashback");
  const abas: [Aba, string][] = [["cashback", "Cashback"], ["compras", "Compras"], ["vantagens", "Vantagens"], ["nivel", "Nível"], ["ajustes", "Ajustes"]];
  const n = dados.nivel;
  const disponivel = dados.cashbacks.filter((c) => diasAte(c.liberaEm) <= 0).reduce((s, c) => s + c.valor, 0);
  const aLiberar = dados.cashbacks.filter((c) => diasAte(c.liberaEm) > 0).reduce((s, c) => s + c.valor, 0);
  const proximoVence = dados.cashbacks.filter((c) => diasAte(c.liberaEm) <= 0).map((c) => diasAte(c.venceEm)).sort((a, b) => a - b)[0];
  const cor = COR_NIVEL[n.nome];
  const alvo = n.proximo === "Prata" ? 1000 : n.proximo === "Ouro" ? 2000 : n.proximo === "Diamante" ? 4000 : 4000;
  const pct = n.proximo ? Math.min(100, Math.round((n.gasto12m / alvo) * 100)) : 100;
  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-fraco">Minha conta</p>
          <h1 className="titulao text-3xl sm:text-4xl">Olá, {dados.nome}</h1>
        </div>
        <button onClick={sair} className="text-xs font-bold uppercase tracking-wide text-fraco underline underline-offset-4 hover:text-texto">Sair</button>
      </div>
      {dados.demo ? <p className="bg-destaque px-3 py-2 text-xs font-bold uppercase tracking-wide">Dados de demonstração</p> : null}

      <div className="grid gap-5 lg:grid-cols-[380px_1fr]">
        {/* coluna do resumo */}
        <div className="space-y-5 lg:sticky lg:top-24 lg:self-start">
          <section className="relative overflow-hidden bg-texto p-6 text-white">
            <div className="pointer-events-none absolute -bottom-8 -right-8 h-20 w-20 rotate-12 bg-destaque" />
            <p className="relative text-xs font-bold uppercase tracking-widest text-white/70">Cashback para usar agora</p>
            <p className="relative mt-1 text-5xl font-black tracking-tight text-destaque">{reais(disponivel)}</p>
            <div className="relative mt-4 grid grid-cols-2 gap-3 border-t border-white/20 pt-4 text-sm">
              <div>
                <p className="text-xs text-white/60">Libera em breve</p>
                <p className="font-bold">{reais(aLiberar)}</p>
              </div>
              <div>
                <p className="text-xs text-white/60">Próximo vencimento</p>
                <p className={`font-bold ${proximoVence !== undefined && proximoVence <= 7 ? "text-destaque" : ""}`}>{proximoVence === undefined ? "—" : proximoVence <= 0 ? "hoje" : `${proximoVence} ${proximoVence === 1 ? "dia" : "dias"}`}</p>
              </div>
            </div>
          </section>

          <section className="border border-borda bg-painel p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-widest text-fraco">Seu nível</p>
              <span className="px-3 py-1 text-xs font-black uppercase tracking-wide text-white" style={{ background: cor }}>{n.nome}</span>
            </div>
            <div className="mt-4 h-2 w-full bg-tenue">
              <div className="h-2 transition-all" style={{ width: `${pct}%`, background: cor }} />
            </div>
            <div className="mt-2 flex justify-between text-[10px] font-bold uppercase tracking-wide text-fraco">
              {ordem.map((o) => <span key={o} className={o === n.nome ? "text-texto" : ""}>{o}</span>)}
            </div>
            <p className="mt-3 text-sm">
              {n.proximo ? <>Faltam <b>{reais(n.faltaGasto)}</b>{n.faltaCompras > 0 ? <> e <b>{n.faltaCompras} {n.faltaCompras === 1 ? "compra" : "compras"}</b></> : null} para o nível <b>{n.proximo}</b>.</> : "Você está no nível máximo. Obrigado!"}
            </p>
          </section>
        </div>

        {/* coluna do conteúdo */}
        <div className="min-w-0 space-y-4">
          <div className="grid grid-cols-5 border border-borda bg-painel">
            {abas.map(([k, t]) => (
              <button key={k} onClick={() => setAba(k)} className={`flex flex-col items-center justify-center gap-1 px-1 py-3 text-[10px] font-bold uppercase tracking-wide transition sm:flex-row sm:gap-2 sm:px-2 sm:text-sm ${aba === k ? "bg-texto text-white" : "hover:bg-tenue"}`}>
                <Icone d={ICONES[k]} />
                {t}
              </button>
            ))}
          </div>
          {aba === "cashback" ? <AbaCashback dados={dados} /> : aba === "compras" ? <AbaCompras dados={dados} /> : aba === "vantagens" ? <AbaVantagens dados={dados} /> : aba === "nivel" ? <AbaNivel dados={dados} /> : <AbaAjustes dados={dados} />}
        </div>
      </div>
    </div>
  );
}

function AbaCashback({ dados }: { dados: DadosConta }) {
  const extrato = dados.extrato;
  return (
    <div className="space-y-5">
      {dados.cashbacks.length === 0 ? (
        <p className="border border-borda bg-painel p-8 text-center text-fraco">Você não tem cashback no momento. Ele aparece aqui depois da sua próxima compra.</p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
          {dados.cashbacks.map((c, i) => {
            const libera = diasAte(c.liberaEm);
            const vence = diasAte(c.venceEm);
            const pronto = libera <= 0;
            const urgente = pronto && vence <= 7;
            return (
              <li key={i} className={`relative overflow-hidden border p-4 ${urgente ? "border-promo" : "border-borda"} bg-painel`}>
                <span className={`absolute left-0 top-0 h-full w-1 ${pronto ? "bg-ok" : "bg-destaque"}`} />
                <div className="flex items-start justify-between gap-2 pl-2">
                  <p className="text-2xl font-black">{reais(c.valor)}</p>
                  <span className={`px-2 py-1 text-[10px] font-black uppercase tracking-wide ${pronto ? "bg-ok text-white" : "bg-destaque text-texto"}`}>{pronto ? "Liberado" : `Libera em ${libera} ${libera === 1 ? "dia" : "dias"}`}</span>
                </div>
                <p className="mt-2 pl-2 text-xs text-fraco">{pronto ? "Pronto para usar" : `Libera em ${dataBr(c.liberaEm)}`}</p>
                <p className={`pl-2 text-xs ${urgente ? "font-bold text-promo" : "text-fraco"}`}>
                  {vence <= 0 ? "Vence hoje" : `Vence em ${dataBr(c.venceEm)} · faltam ${vence} ${vence === 1 ? "dia" : "dias"}`}
                </p>
              </li>
            );
          })}
        </ul>
      )}
      {extrato.length > 0 ? (
        <section>
          <h2 className="mb-2 text-xs font-bold uppercase tracking-widest text-fraco">Extrato</h2>
          <ul className="grid gap-2 text-sm md:grid-cols-2">
            {extrato.map((e, i) => {
              const venceu = e.saldo > 0 && diasAte(e.venceEm) < 0;
              return (
                <li key={i} className="border border-borda bg-painel px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-bold">Ganhou {reais(e.ganhou)}</span>
                    <span className="text-xs text-fraco">{dataBr(e.data)}</span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-fraco">
                    <span>Usou <b className="text-texto">{reais(e.usou)}</b></span>
                    <span>{venceu ? "Venceu" : "Sobrou"} <b className="text-texto">{reais(e.saldo)}</b></span>
                    <span>{venceu ? `Venceu em ${dataBr(e.venceEm)}` : e.saldo > 0 ? `Vence em ${dataBr(e.venceEm)}` : "Usado por completo"}</span>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
      <p className="text-xs text-fraco">Use o cashback nas lojas Seleto informando seu celular no caixa. Desconto máximo de 20% do valor da compra.</p>
    </div>
  );
}

function AbaCompras({ dados }: { dados: DadosConta }) {
  if (dados.comprasOcultas) return <p className="border border-borda bg-painel p-8 text-center text-fraco">Por segurança, suas compras aparecem depois que ativarmos a confirmação por WhatsApp. Em breve!</p>;
  if (dados.compras.length === 0) return <p className="border border-borda bg-painel p-8 text-center text-fraco">Nenhuma compra encontrada.</p>;
  return (
    <ul className="grid items-start gap-3 xl:grid-cols-2">
      {dados.compras.map((c) => (
        <li key={c.id} className="border border-borda bg-painel">
          <div className="flex items-center justify-between gap-3 border-b border-borda bg-tenue px-4 py-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide">{c.loja}</p>
              <p className="text-xs text-fraco">{dataBr(c.data)}</p>
            </div>
            <p className="text-lg font-black">{reais(c.valor)}</p>
          </div>
          <div className="px-4 py-3">
            {c.itens.length > 0 ? (
              <ul className="space-y-1 text-sm">
                {c.itens.map((it, i) => (
                  <li key={i} className="flex justify-between gap-3">
                    <span>{it.nome}{it.detalhe ? <span className="text-fraco"> · {it.detalhe}</span> : null}</span>
                    <span className="text-fraco">{it.quantidade}×</span>
                  </li>
                ))}
              </ul>
            ) : null}
            {c.cashbackUsado > 0 ? <p className="mt-2 inline-block bg-destaque px-2 py-1 text-[10px] font-black uppercase tracking-wide">Cashback usado: {reais(c.cashbackUsado)}</p> : null}
            <PosVenda loja={c.loja} data={c.data} />
          </div>
        </li>
      ))}
    </ul>
  );
}

function PosVenda({ loja, data }: { loja: string; data: string }) {
  const zap = linkWhatsappDaLoja(loja, `Olá! Sobre minha compra de ${dataBr(data)} na Seleto ${loja}.`);
  if (!zap && !LINK_AVALIACAO_GOOGLE) return null;
  const recente = diasDesde(data) <= 30;
  return (
    <div className="mt-3 flex flex-wrap gap-2 border-t border-borda pt-3">
      {LINK_AVALIACAO_GOOGLE && recente ? <a href={LINK_AVALIACAO_GOOGLE} target="_blank" rel="noopener noreferrer" className="btn !px-3 !py-2 !text-xs">Avaliar no Google</a> : null}
      {zap ? <a href={zap} target="_blank" rel="noopener noreferrer" className="btn-claro !px-3 !py-2 !text-xs">Falar com a loja</a> : null}
    </div>
  );
}

function AbaNivel({ dados }: { dados: DadosConta }) {
  const n = dados.nivel;
  const regras: [string, string][] = [["Prata", "Entrada no clube: 3 compras e R$ 1.000 em 12 meses"], ["Ouro", "R$ 2.000 em 12 meses"], ["Diamante", "R$ 4.000 em 12 meses"]];
  return (
    <div className="space-y-3">
      <div className="border border-borda bg-painel p-5">
        <p className="text-xs font-bold uppercase tracking-widest text-fraco">Nos últimos 12 meses</p>
        <div className="mt-2 grid grid-cols-2 gap-3">
          <div><p className="text-3xl font-black">{n.compras12m}</p><p className="text-xs text-fraco">{n.compras12m === 1 ? "compra" : "compras"}</p></div>
          <div><p className="text-3xl font-black">{reais(n.gasto12m)}</p><p className="text-xs text-fraco">em compras</p></div>
        </div>
      </div>
      <div className="border border-borda bg-painel p-5 text-sm">
        <p className="text-xs font-bold uppercase tracking-widest text-fraco">Como entrar e subir de nível</p>
        <p className="mt-2">Para entrar no clube: <b>{PORTA_DO_CLUBE}</b>. Depois o nível sobe pelo valor comprado no ano: <b>Ouro</b> a partir de R$ 2.000 e <b>Diamante</b> a partir de R$ 4.000.</p>
        {n.nome === "Cliente" ? <p className="mt-2 text-fraco">Você ainda não está no clube.{n.faltaCompras > 0 ? <> Faltam <b className="text-texto">{n.faltaCompras} {n.faltaCompras === 1 ? "compra" : "compras"}</b></> : null}{n.faltaCompras > 0 && n.faltaGasto > 0 ? " e " : null}{n.faltaGasto > 0 ? <><b className="text-texto">{reais(n.faltaGasto)}</b> em compras</> : null}{n.faltaCompras > 0 || n.faltaGasto > 0 ? " para entrar." : null}</p> : null}
      </div>
      <ul className="grid gap-2 xl:grid-cols-3">
        {regras.map(([nome, regra]) => {
          const atingido = ordem.indexOf(n.nome) >= ordem.indexOf(nome);
          return (
            <li key={nome} className={`flex items-center justify-between gap-3 border p-4 ${atingido ? "border-texto" : "border-borda"} bg-painel`}>
              <div className="flex items-center gap-3">
                <span className="h-8 w-8" style={{ background: COR_NIVEL[nome], opacity: atingido ? 1 : 0.35 }} />
                <div>
                  <p className="font-black uppercase">{nome}</p>
                  <p className="text-xs text-fraco">{regra}</p>
                  <ul className="mt-1 list-disc pl-4 text-xs">
                    {(BENEFICIOS_POR_NIVEL.find((b) => b.nivel === nome)?.beneficios ?? []).map((b) => <li key={b}>{b}</li>)}
                  </ul>
                </div>
              </div>
              <span className={`text-xs font-bold uppercase ${atingido ? "text-ok" : "text-fraco"}`}>{atingido ? "Conquistado" : "A conquistar"}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Chave({ ligado, aoMudar, titulo, texto }: { ligado: boolean; aoMudar: (v: boolean) => void; titulo: string; texto: string }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 border border-borda bg-painel p-4">
      <span>
        <span className="block font-bold">{titulo}</span>
        <span className="block text-xs text-fraco">{texto}</span>
      </span>
      <input type="checkbox" role="switch" className="h-5 w-10 shrink-0 accent-black" checked={ligado} onChange={(e) => aoMudar(e.target.checked)} />
    </label>
  );
}

function AbaAjustes({ dados }: { dados: DadosConta }) {
  const [pref, setPref] = useState<Preferencias>(dados.preferencias);
  const [alertas, setAlertas] = useState<Alerta[]>(dados.alertas);
  const [descricao, setDescricao] = useState(() => (paramDaUrl("aviso") ?? "").slice(0, 120));
  const [tamanho, setTamanho] = useState("");
  const [msg, setMsg] = useState("");

  async function mudar(novo: Preferencias) {
    setPref(novo);
    const r = await post("/api/conta/preferencias", novo);
    setMsg(r.ok ? "Preferência salva." : "Não foi possível salvar. Tente de novo.");
  }
  async function criar(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    const r = await post("/api/conta/alertas", { descricao, tamanho });
    const j = await r.json();
    if (!r.ok) return setMsg(j.erro ?? "Não foi possível criar o aviso.");
    setAlertas([j, ...alertas]);
    setDescricao("");
    setTamanho("");
    setMsg("Pronto! Avisamos você quando chegar.");
  }
  async function remover(id: string) {
    setAlertas(alertas.filter((a) => a.id !== id));
    await post("/api/conta/alertas", { remover: id });
  }
  return (
    <div className="grid items-start gap-5 xl:grid-cols-2">
      <section className="space-y-2">
        <h2 className="text-xs font-bold uppercase tracking-widest text-fraco">Mensagens no WhatsApp</h2>
        <Chave ligado={pref.avisosCashback} aoMudar={(v) => mudar({ ...pref, avisosCashback: v })} titulo="Avisos de cashback" texto="Quando você ganha cashback e quando ele está perto de vencer." />
        <Chave ligado={pref.avisosPromocoes} aoMudar={(v) => mudar({ ...pref, avisosPromocoes: v })} titulo="Novidades e promoções" texto="Lançamentos, ofertas e convites da Seleto." />
      </section>
      <section className="space-y-2">
        <h2 className="text-xs font-bold uppercase tracking-widest text-fraco">Me avise quando chegar</h2>
        <form onSubmit={criar} className="grid grid-cols-[1fr_88px] gap-2 border border-borda bg-painel p-4 sm:grid-cols-[1fr_88px_auto]">
          <input className="campo col-span-2 sm:col-span-1" placeholder="Ex.: Tênis de corrida Nike" maxLength={120} value={descricao} onChange={(e) => setDescricao(e.target.value)} required />
          <input className="campo" placeholder="Tam." maxLength={12} value={tamanho} onChange={(e) => setTamanho(e.target.value)} aria-label="Tamanho" />
          <button className="btn !px-4 col-span-2 sm:col-span-1">Avisar</button>
        </form>
        {alertas.length > 0 ? (
          <ul className="divide-y divide-borda border border-borda bg-painel text-sm">
            {alertas.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <span>{a.descricao}{a.tamanho ? <span className="text-fraco"> · tam. {a.tamanho}</span> : null}</span>
                <button onClick={() => remover(a.id)} className="text-xs font-bold uppercase text-fraco underline underline-offset-4 hover:text-promo">Remover</button>
              </li>
            ))}
          </ul>
        ) : null}
      </section>
      {msg ? <p className="text-sm text-fraco" role="status">{msg}</p> : null}
    </div>
  );
}

function Cartao({ icone, titulo, texto, breve, children }: { icone: string; titulo: string; texto: string; breve?: boolean; children?: React.ReactNode }) {
  return (
    <section className="space-y-3 border border-borda bg-painel p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center bg-texto text-white"><Icone d={icone} /></span>
          <div>
            <h3 className="font-black uppercase">{titulo}</h3>
            <p className="text-sm text-fraco">{texto}</p>
          </div>
        </div>
        {breve ? <span className="shrink-0 bg-destaque px-2 py-1 text-[10px] font-black uppercase tracking-wide">Em breve</span> : null}
      </div>
      {children}
    </section>
  );
}

function AbaVantagens({ dados }: { dados: DadosConta }) {
  const [qr, setQr] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [erroQr, setErroQr] = useState("");
  const mensagem = `Conhece a Seleto? Use meu código ${dados.codigoIndicacao} na sua primeira compra e a gente se beneficia!`;

  async function mostrarQr() {
    setErroQr("");
    const r = await fetch("/api/conta/qr");
    if (r.ok) setQr((await r.json()).imagem);
    else setErroQr("Não foi possível gerar o QR agora.");
  }
  async function copiar() {
    try {
      await navigator.clipboard.writeText(dados.codigoIndicacao);
      setCopiado(true);
    } catch {
      setCopiado(false);
    }
  }
  return (
    <div className="grid items-start gap-3 xl:grid-cols-2">
      <Cartao icone="M12 2l3 7 7 .6-5.3 4.7 1.6 7.2L12 17.8 5.7 21.5l1.6-7.2L2 9.6 9 9z" titulo="Lista VIP" texto="Entre no grupo VIP da Seleto e receba ofertas e novidades antes de todo mundo.">
        {dados.vipLink ? (
          <a href={dados.vipLink} target="_blank" rel="noopener noreferrer" className="btn w-full">Entrar na lista VIP</a>
        ) : (
          <p className="text-xs text-fraco">A lista VIP está fechada no momento. Avisaremos quando abrir.</p>
        )}
      </Cartao>

      <Cartao icone="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8" titulo="Indique um amigo" texto="Quem indica ganha cashback quando o amigo faz a primeira compra." breve>
        <div className="flex items-center justify-between gap-3 bg-tenue px-3 py-2">
          <span className="font-mono text-lg font-black tracking-wider">{dados.codigoIndicacao}</span>
          <button onClick={copiar} className="text-xs font-bold uppercase underline underline-offset-4">{copiado ? "Copiado!" : "Copiar"}</button>
        </div>
        <a href={`https://wa.me/?text=${encodeURIComponent(mensagem)}`} target="_blank" rel="noopener noreferrer" className="btn-claro w-full">Enviar pelo WhatsApp</a>
      </Cartao>

      <Cartao icone="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h3v3h-3zM20 14v.01M14 20v.01M20 20v.01" titulo="QR no caixa" texto="Mostre o QR no celular e o vendedor aplica seu cashback sem digitar nada." breve>
        {qr ? (
          <div className="flex flex-col items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qr} alt="QR code para o caixa" width={180} height={180} className="border border-borda" />
            <p className="text-xs text-fraco">Vale por 10 minutos. Por enquanto é uma demonstração.</p>
          </div>
        ) : (
          <button onClick={mostrarQr} className="btn-claro w-full">Mostrar meu QR</button>
        )}
        {erroQr ? <p className="text-xs text-promo">{erroQr}</p> : null}
      </Cartao>

      <Cartao icone="M20 21v-8a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8M4 16s1.5-2 4-2 4 2 8 2 4-2 4-2M2 21h20M7 11V7M12 11V7M17 11V7M7 4v.01M12 4v.01M17 4v.01" titulo="Presente de aniversário" texto="No mês do seu aniversário você ganha um cashback de presente, automático." breve />

      <Cartao icone="M12 2l3 7 7 .6-5.3 4.7 1.6 7.2L12 17.8 5.7 21.5l1.6-7.2L2 9.6 9 9z" titulo="Avaliou, ganhou R$ 50 de cashback" texto="Avalie sua compra da Seleto no Google e ganhe R$ 50 de cashback. A loja confere a sua avaliação e libera o valor para você.">
        {LINK_AVALIACAO_GOOGLE ? <a href={LINK_AVALIACAO_GOOGLE} target="_blank" rel="noopener noreferrer" className="btn-claro w-full">Avaliar no Google</a> : null}
      </Cartao>
    </div>
  );
}
