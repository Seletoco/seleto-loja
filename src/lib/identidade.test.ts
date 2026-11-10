import { test } from "node:test";
import assert from "node:assert/strict";
import { confereIdentidade, nascimentoIso } from "./identidade";
import { mesmoNomeCompleto, nomeBonito } from "./nome";

test("data de nascimento: aceita os dois formatos e recusa datas impossíveis", () => {
  assert.equal(nascimentoIso("1990-05-17"), "1990-05-17");
  assert.equal(nascimentoIso("17/05/1990"), "1990-05-17");
  assert.equal(nascimentoIso("31/02/1990"), null);
  assert.equal(nascimentoIso("1890-01-01"), null);
  assert.equal(nascimentoIso("2999-01-01"), null);
  assert.equal(nascimentoIso("abc"), null);
  assert.equal(nascimentoIso(""), null);
});

test("nome completo: primeiro nome e último sobrenome precisam bater", () => {
  assert.equal(mesmoNomeCompleto("Maria Souza", "MARIA APARECIDA SOUZA"), true);
  assert.equal(mesmoNomeCompleto("josé  da silva", "JOSE ANTONIO DA SILVA"), true);
  assert.equal(mesmoNomeCompleto("Maria", "MARIA SOUZA"), false); // só o primeiro nome não basta
  assert.equal(mesmoNomeCompleto("Maria Lima", "MARIA SOUZA"), false);
  assert.equal(mesmoNomeCompleto("Carlos Souza", "MARIA SOUZA"), false);
});

test("identidade: nome E nascimento; cadastro sem nascimento nunca confere", () => {
  const cad = { nome: "MARIA APARECIDA SOUZA", nascimento: "1990-05-17" };
  assert.equal(confereIdentidade({ nome: "Maria Souza", nascimento: "1990-05-17" }, cad), true);
  assert.equal(confereIdentidade({ nome: "Maria Souza", nascimento: "1990-05-18" }, cad), false);
  assert.equal(confereIdentidade({ nome: "Ana Souza", nascimento: "1990-05-17" }, cad), false);
  assert.equal(confereIdentidade({ nome: "Maria Souza", nascimento: null }, cad), false);
  assert.equal(confereIdentidade({ nome: "Maria Souza", nascimento: "1990-05-17" }, { ...cad, nascimento: null }), false);
});

test("nome bonito", () => {
  assert.equal(nomeBonito("MARIA APARECIDA  SOUZA"), "Maria Aparecida Souza");
});
