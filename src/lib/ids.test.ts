import { describe, expect, it } from "vitest";
import { ehId } from "./ids";

describe("ids vindos do navegador", () => {
  it("aceita só texto simples no formato dos ids", () => {
    expect(ehId("cmwefr72c0001ww5yub8g0g0k")).toBe(true);
    expect(ehId("contestacao")).toBe(true);
  });

  it("recusa objetos que virariam filtro do Prisma, e textos fora do formato", () => {
    for (const valor of [{ not: "" }, ["a"], 1, null, undefined, "", "a b", "../x", "x".repeat(65), "id' OR 1=1"]) {
      expect(ehId(valor), JSON.stringify(valor)).toBe(false);
    }
  });
});
