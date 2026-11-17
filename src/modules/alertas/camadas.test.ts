import { describe, expect, it } from "vitest";
import { avisosDoDia, chaveDoAlerta, diasUteisAte } from "./camadas";

const base = { conferido: false, temSubstituto: false };

describe("dias úteis até o vencimento", () => {
  it("conta só de segunda a sexta, depois de hoje e até o vencimento", () => {
    // 12/11/2026 é quinta-feira.
    expect(diasUteisAte("2026-11-12", "2026-11-12")).toBe(0);
    expect(diasUteisAte("2026-11-12", "2026-11-13")).toBe(1); // sexta
    expect(diasUteisAte("2026-11-12", "2026-11-16")).toBe(2); // segunda
    expect(diasUteisAte("2026-11-13", "2026-11-16")).toBe(1); // de sexta para segunda: véspera útil
    expect(diasUteisAte("2026-11-14", "2026-11-16")).toBe(1); // sábado
    expect(diasUteisAte("2026-11-12", "2026-11-11")).toBe(-1);
  });
});

describe("camadas de alerta", () => {
  it("não avisa com mais de 5 dias úteis nem depois do vencimento", () => {
    expect(avisosDoDia({ ...base, diasUteis: 6 })).toEqual([]);
    expect(avisosDoDia({ ...base, diasUteis: -1 })).toEqual([]);
  });

  it("escolhe só a camada mais urgente que se aplica", () => {
    const camadaDe = (diasUteis: number) => avisosDoDia({ ...base, diasUteis }).map((aviso) => aviso.camada);
    expect(camadaDe(5)).toEqual(["d5"]);
    expect(camadaDe(3)).toEqual(["d5"]);
    expect(camadaDe(2)).toEqual(["d2"]);
    expect(camadaDe(1)).toEqual(["d1"]);
    expect(camadaDe(0)).toEqual(["d0"]);
  });

  it("escala ao substituto na véspera útil e no dia, só sem conferência e só se houver substituto", () => {
    const escalada = { camada: "escalada", destino: "substituto" };
    expect(avisosDoDia({ diasUteis: 1, conferido: false, temSubstituto: true })).toContainEqual(escalada);
    expect(avisosDoDia({ diasUteis: 0, conferido: false, temSubstituto: true })).toContainEqual(escalada);
    expect(avisosDoDia({ diasUteis: 2, conferido: false, temSubstituto: true })).not.toContainEqual(escalada);
    expect(avisosDoDia({ diasUteis: 1, conferido: true, temSubstituto: true })).not.toContainEqual(escalada);
    expect(avisosDoDia({ diasUteis: 1, conferido: false, temSubstituto: false })).not.toContainEqual(escalada);
  });

  it("a chave muda com a camada e com a data final, para o prazo editado ser avisado de novo", () => {
    expect(chaveDoAlerta("p1", "d5", "2026-11-20")).toBe("p1:d5:2026-11-20");
    expect(chaveDoAlerta("p1", "d5", "2026-11-20")).not.toBe(chaveDoAlerta("p1", "d5", "2026-11-23"));
    expect(chaveDoAlerta("p1", "d5", "2026-11-20")).not.toBe(chaveDoAlerta("p1", "d2", "2026-11-20"));
  });
});
