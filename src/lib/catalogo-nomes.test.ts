import { test } from "node:test";
import assert from "node:assert/strict";
import { bonitoMarca, categoriaDoSite, limparNome, ordenarTamanhos } from "./catalogo-nomes";

test("tira os códigos de coleção do começo do nome", () => {
  assert.equal(limparNome("VR27 BABYLOOK FARM VIES BORDADO FLOR"), "Babylook Farm Vies Bordado Flor");
  assert.equal(limparNome("INV26 TÊNIS ADIDAS 1609ER RS"), "Tênis Adidas 1609ER RS");
  assert.equal(limparNome("PERM CHINELO ADIDAS SLIDE ADILETTE AQUA"), "Chinelo Adidas Slide Adilette Aqua");
  assert.equal(limparNome("VERAO26 BOLSA ADIDAS BOLSA ADICOLOR FB"), "Bolsa Adidas Bolsa Adicolor FB");
  assert.equal(limparNome("BST 10 ALMA DE SAL SHORT VOLEY BASICO"), "Alma de Sal Short Voley Basico");
  assert.equal(limparNome("BST2 ACESSÓRIOS ADIDAS PIN FLOR ROSA"), "Acessórios Adidas Pin Flor Rosa");
  assert.equal(limparNome("COPA 26 CAMISETA CHAMPION SOCCER BRASIL"), "Camiseta Champion Soccer Brasil");
});

test("acerta acento, siglas e códigos com número", () => {
  assert.equal(limparNome("VR25 TENIS ADIDAS CAMPUS 00S"), "Tênis Adidas Campus 00S");
  assert.equal(limparNome("VR26 BONE APPROVE 5PANEL  NUMBERS II"), "Boné Approve 5PANEL Numbers II");
  assert.equal(limparNome("CAMISA NIKE MINI LOGO"), "Camisa Nike Mini Logo");
});

test("nome que só tem o código não fica vazio", () => {
  assert.notEqual(limparNome("VR27"), "");
});

test("marca", () => {
  assert.equal(bonitoMarca("ADIDAS"), "Adidas");
  assert.equal(bonitoMarca("THUG NINE"), "Thug Nine");
  assert.equal(bonitoMarca("ALMA DE SAL"), "Alma de Sal");
  assert.equal(bonitoMarca("FDL"), "FDL");
  assert.equal(bonitoMarca("SEM MARCA"), "Outros");
  assert.equal(bonitoMarca(null), "Outros");
});

test("categoria do banco para a da vitrine", () => {
  const casos: [string, string][] = [
    ["CAMISETA", "Camisetas"], ["REGATA", "Camisetas"], ["BABYLOOK", "Camisetas"], ["TOP FITNESS", "Camisetas"], ["CAMISA TSHIRT", "Camisetas"],
    ["TÊNIS", "Tênis"], ["SHORT 1", "Shorts"], ["CHINELO", "Chinelos"], ["BONE", "Bonés"], ["CALÇAS", "Calças"], ["CALÇA FITNESS", "Calças"],
    ["CASACO", "Casacos e Moletons"], ["CASACO FITNESS", "Casacos e Moletons"],
    ["BOLSA DA GEMA", "Bolsas e Mochilas"], ["BOLSINHA ME LEVA", "Bolsas e Mochilas"], ["MOCHILA COOLER", "Bolsas e Mochilas"], ["NECESSARIE CACULA", "Bolsas e Mochilas"], ["TOTEBAG CARIOCA", "Bolsas e Mochilas"],
    ["CADARÇO", "Outros"], ["GARRAFA GLUB GLUB 500ML", "Outros"], ["COOLER FAROFA", "Outros"], ["MEIA", "Outros"], ["CUECA", "Outros"], ["PLANNER", "Outros"], [null as unknown as string, "Outros"],
  ];
  for (const [grupo, esperado] of casos) assert.equal(categoriaDoSite(grupo), esperado, grupo);
});

test("tamanhos: números, letras de roupa e único", () => {
  assert.deepEqual(ordenarTamanhos(["42", "36", "40", "36"]), ["36", "40", "42"]);
  assert.deepEqual(ordenarTamanhos(["GG", "P", "G", "M"]), ["P", "M", "G", "GG"]);
  assert.deepEqual(ordenarTamanhos(["UN"]), ["UN"]);
  assert.deepEqual(ordenarTamanhos(["", " "]), []);
});
