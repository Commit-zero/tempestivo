import { describe, expect, it } from "vitest";
import { bancoResponde } from "./index";

describe("saúde do banco (integração)", () => {
  it("responde quando o PostgreSQL está no ar", async () => {
    expect(await bancoResponde()).toBe(true);
  });
});
