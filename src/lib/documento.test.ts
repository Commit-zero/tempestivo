import { describe, expect, it } from "vitest";
import { documentoValido, formatarDocumento, soDigitos, telefoneParaWhatsApp } from "./documento";

// Números fictícios, válidos só pelo dígito verificador.
describe("documento", () => {
  it("valida CPF pelo dígito verificador, com ou sem máscara", () => {
    expect(documentoValido("529.982.247-25")).toBe(true);
    expect(documentoValido("52998224725")).toBe(true);
    expect(documentoValido("529.982.247-26")).toBe(false);
    expect(documentoValido("111.111.111-11")).toBe(false);
  });

  it("valida CNPJ pelo dígito verificador", () => {
    expect(documentoValido("11.222.333/0001-81")).toBe(true);
    expect(documentoValido("11.222.333/0001-82")).toBe(false);
    expect(documentoValido("00000000000000")).toBe(false);
  });

  it("recusa tamanhos que não são CPF nem CNPJ", () => {
    expect(documentoValido("123")).toBe(false);
    expect(documentoValido("")).toBe(false);
  });

  it("formata e tira a máscara", () => {
    expect(formatarDocumento("52998224725")).toBe("529.982.247-25");
    expect(formatarDocumento("11222333000181")).toBe("11.222.333/0001-81");
    expect(soDigitos("(11) 91234-5678")).toBe("11912345678");
  });

  it("monta o telefone do WhatsApp com DDI, ou devolve null", () => {
    expect(telefoneParaWhatsApp("(11) 91234-5678")).toBe("5511912345678");
    expect(telefoneParaWhatsApp("+55 11 91234-5678")).toBe("5511912345678");
    expect(telefoneParaWhatsApp("1234")).toBeNull();
  });
});
