import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { aiErrorMessage, activeProvider, consentMatches } = await import("./provider");

describe("mensagens de erro da IA", () => {
  it("avisa quando acabou o crédito", () => {
    expect(aiErrorMessage(400, '{"error":{"message":"Your credit balance is too low to access the Anthropic API."}}')).toMatch(/sem créditos/);
  });
  it("chave inválida", () => expect(aiErrorMessage(401, "")).toMatch(/Chave/));
  it("sobrecarga", () => expect(aiErrorMessage(529, "overloaded_error")).toMatch(/sobrecarregado/));
  it("genérico", () => expect(aiErrorMessage(500, "boom")).toMatch(/Tente novamente/));
});

describe("qual IA usar", () => {
  it("prefere a chave gratuita do Gemini quando não há escolha explícita", () => {
    vi.stubEnv("AI_PROVIDER", "");
    vi.stubEnv("GEMINI_API_KEY", "x");
    vi.stubEnv("ANTHROPIC_API_KEY", "y");
    expect(activeProvider()).toBe("gemini");
    vi.stubEnv("AI_PROVIDER", "anthropic");
    expect(activeProvider()).toBe("anthropic");
    vi.unstubAllEnvs();
  });
  it("autorização das fotos vale só para o serviço aceito", () => {
    expect(consentMatches("ia:gemini", "gemini")).toBe(true);
    expect(consentMatches("2026-11", "gemini")).toBe(false);
    expect(consentMatches("2026-11", "anthropic")).toBe(true);
  });
  it("limite gratuito", () => expect(aiErrorMessage(429, "RESOURCE_EXHAUSTED")).toMatch(/limite gratuito/));
});
