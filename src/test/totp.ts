import { createHmac } from "node:crypto";

// Gerador de códigos do aplicativo autenticador (RFC 6238, SHA-1, 6 dígitos, 30 s),
// escrito à parte da biblioteca do app: os testes conferem que um aplicativo comum
// geraria o código que o servidor aceita. Usado pelo Vitest e pelo Playwright.

const ALFABETO = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function deBase32(texto: string): Buffer {
  let bits = "";
  for (const letra of texto.replace(/[\s=]/g, "").toUpperCase()) {
    const indice = ALFABETO.indexOf(letra);
    if (indice < 0) throw new Error("Chave fora do formato base32.");
    bits += indice.toString(2).padStart(5, "0");
  }
  return Buffer.from((bits.match(/.{8}/g) ?? []).map((octeto) => parseInt(octeto, 2)));
}

/** `passo`: 0 é o código de agora, -1 o anterior e 1 o próximo (o servidor aceita os três). */
export function codigoTotp(chaveBase32: string, passo = 0, instante = Date.now()): string {
  const contador = Buffer.alloc(8);
  contador.writeBigUInt64BE(BigInt(Math.floor(instante / 30_000) + passo));
  const resumo = createHmac("sha1", deBase32(chaveBase32)).update(contador).digest();
  const inicio = resumo[resumo.length - 1]! & 0x0f;
  return String((resumo.readUInt32BE(inicio) & 0x7fffffff) % 1_000_000).padStart(6, "0");
}
