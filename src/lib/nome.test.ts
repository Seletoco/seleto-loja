import { test } from "node:test";
import assert from "node:assert/strict";
import { mesmoPrimeiroNome } from "./nome";

test("ignora maiúscula, acento e sobrenome", () => {
  assert.equal(mesmoPrimeiroNome("maria souza", "MARIA"), true);
  assert.equal(mesmoPrimeiroNome("José", "JOSE ANTONIO"), true);
  assert.equal(mesmoPrimeiroNome("  Ângela ", "angela"), true);
});

test("aceita apelido que é começo do nome (3+ letras)", () => {
  assert.equal(mesmoPrimeiroNome("Vic", "VICTOR"), true);
  assert.equal(mesmoPrimeiroNome("Vi", "VICTOR"), false);
});

test("recusa nome diferente ou vazio", () => {
  assert.equal(mesmoPrimeiroNome("Carlos", "MARIA"), false);
  assert.equal(mesmoPrimeiroNome("Ana", "Mariana"), false);
  assert.equal(mesmoPrimeiroNome("", "MARIA"), false);
  assert.equal(mesmoPrimeiroNome("123", "MARIA"), false);
});
