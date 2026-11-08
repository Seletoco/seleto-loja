import { test } from "node:test";
import assert from "node:assert/strict";
import { emailValido, erroDeSenha, hashSenha, senhaConfere } from "./senha";

test("hash confere com a senha certa e recusa a errada", () => {
  const h = hashSenha("minha-senha-boa");
  assert.ok(h.startsWith("scrypt$"));
  assert.ok(!h.includes("minha-senha-boa"));
  assert.equal(senhaConfere("minha-senha-boa", h), true);
  assert.equal(senhaConfere("outra-senha", h), false);
});

test("o mesmo texto gera hashes diferentes (sal)", () => {
  assert.notEqual(hashSenha("abcdefgh1"), hashSenha("abcdefgh1"));
});

test("hash inválido ou vazio nunca confere", () => {
  assert.equal(senhaConfere("x", null), false);
  assert.equal(senhaConfere("x", "lixo"), false);
});

test("regras de e-mail e senha", () => {
  assert.equal(emailValido("cliente@exemplo.com"), true);
  assert.equal(emailValido("sem-arroba"), false);
  assert.equal(erroDeSenha("curta"), "A senha precisa ter pelo menos 8 caracteres.");
  assert.notEqual(erroDeSenha("12345678"), null);
  assert.equal(erroDeSenha("uma-senha-razoavel"), null);
});
