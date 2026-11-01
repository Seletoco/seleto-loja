"""Gera data/produtos.json a partir do cliente.html do catálogo (versão sem dado interno).

Uso: python3 scripts/gerar-dados.py /caminho/seleto-catalogo/cliente.html
É só o INSTANTÂNEO de exemplo para o site de teste. Em produção os produtos vêm do banco
(views loja.v_produtos / loja.v_variacoes) — ver supabase/migrations.
"""
import json, re, sys

CATALOGO = "https://catalogo.seletoco.com.br"
html = open(sys.argv[1], encoding="utf-8").read()
bruto = json.loads(re.search(r"let PRODUTOS\s*=\s*(\[.*?\]);\n", html, re.S)[1])

def preco(a, b):
    return None if a in (None, "") else round(int(a) + int(b or 0) / 100, 2)

NOMES_CATEGORIA = {"CasacosMoletons": "Casacos e Moletons", "BolsasMochilas": "Bolsas e Mochilas"}

saida = []
for p in bruto:
    if p.get("chegando") or p.get("cat") == "Chegando":
        continue
    cheio = preco(p.get("pa"), p.get("pb"))
    de = preco(p.get("de_pa"), p.get("de_pb"))
    if not cheio:
        continue
    saida.append({
        "ref": p["r"],
        "nome": p["n"].strip(),
        "marca": p["m"],
        "categoria": NOMES_CATEGORIA.get(p["cat"], p["cat"]),
        "cor": p.get("cor") or "",
        "tamanhos": sorted(p.get("tam", {}).keys(), key=lambda t: (len(t), t)),
        "preco": cheio,
        "precoDe": de if de and de > cheio else None,
        "foto": (CATALOGO + p["img"]) if p.get("img") else None,
        "novo": bool(p.get("novo") or p.get("novo30")),
    })
json.dump(saida, open("data/produtos.json", "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
print(len(saida), "produtos;", sum(1 for x in saida if x["foto"]), "com foto;", sum(1 for x in saida if x["precoDe"]), "em promoção")
