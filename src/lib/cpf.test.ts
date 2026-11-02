import { test } from "node:test";
import assert from "node:assert/strict";
import { cpfValido, formatarCpf } from "./cpf";

test("valida CPF pelos dígitos verificadores", () => {
  assert.equal(cpfValido("529.982.247-25"), true);
  assert.equal(cpfValido("52998224725"), true);
  assert.equal(cpfValido("529.982.247-26"), false);
  assert.equal(cpfValido("111.111.111-11"), false);
  assert.equal(cpfValido("123"), false);
  assert.equal(cpfValido(""), false);
});

test("formata enquanto digita", () => {
  assert.equal(formatarCpf("5299"), "529.9");
  assert.equal(formatarCpf("529982"), "529.982");
  assert.equal(formatarCpf("5299822472"), "529.982.247-2");
  assert.equal(formatarCpf("52998224725999"), "529.982.247-25");
});
