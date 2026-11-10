import { test } from "node:test";
import assert from "node:assert/strict";
import { nomeParaPreencher } from "./cpf-nome";

test("campo vazio ou só com um nome recebe o primeiro nome do cadastro", () => {
  assert.equal(nomeParaPreencher("", "Maria"), "Maria ");
  assert.equal(nomeParaPreencher("Mari", "Maria"), "Maria ");
});

test("quem já digitou nome e sobrenome não é sobrescrito", () => {
  assert.equal(nomeParaPreencher("Maria Souza", "Maria"), "Maria Souza");
});
