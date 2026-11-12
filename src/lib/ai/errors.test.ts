import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { aiErrorMessage } = await import("./provider");

describe("mensagens de erro da IA", () => {
  it("avisa quando acabou o crédito", () => {
    expect(aiErrorMessage(400, '{"error":{"message":"Your credit balance is too low to access the Anthropic API."}}')).toMatch(/sem créditos/);
  });
  it("chave inválida", () => expect(aiErrorMessage(401, "")).toMatch(/Chave/));
  it("sobrecarga", () => expect(aiErrorMessage(529, "overloaded_error")).toMatch(/sobrecarregado/));
  it("genérico", () => expect(aiErrorMessage(500, "boom")).toMatch(/Tente novamente/));
});
