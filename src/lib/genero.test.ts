import { test } from "node:test";
import assert from "node:assert/strict";
import { generoDe } from "./genero";

test("reconhece feminino pelo nome", () => {
  assert.equal(generoDe("Short Hurley Fem. Madnen"), "feminino");
  assert.equal(generoDe("Babylook Nike Sportswear"), "feminino");
  assert.equal(generoDe("Top Fitness Preto"), "feminino");
  assert.equal(generoDe("Vestido Ribana Bege"), "feminino");
});

test("reconhece masculino pelo nome", () => {
  assert.equal(generoDe("Camiseta Masc. Hurley"), "masculino");
  assert.equal(generoDe("Cueca Boxer Lupo"), "masculino");
});

test("sem sinal ou com sinais contraditórios não classifica", () => {
  assert.equal(generoDe("Tênis Nike Air Max"), null);
  assert.equal(generoDe("Camiseta Fem. Masc. Unissex"), null);
  assert.equal(generoDe("Boné Top Gun"), null); // "top" só conta no começo do nome
});

test("não confunde palavras que só contêm o sinal", () => {
  assert.equal(generoDe("Camiseta Femme Style"), null);
  assert.equal(generoDe("Short Mascote"), null);
});
