// Numeração única do CNJ (Resolução 65/2008): NNNNNNN-DD.AAAA.J.TR.OOOO, 20 dígitos.
// O dígito verificador DD segue o módulo 97, base 10 (ISO 7064).

const VINTE_DIGITOS = /^\d{20}$/;

export function soDigitosDoNumero(numero: string): string {
  return numero.replace(/\D/g, "");
}

export function numeroCnjValido(numero: string): boolean {
  const digitos = soDigitosDoNumero(numero);
  if (!VINTE_DIGITOS.test(digitos)) return false;
  const sequencial = digitos.slice(0, 7);
  const verificador = digitos.slice(7, 9);
  const resto = digitos.slice(9); // AAAA J TR OOOO
  return BigInt(`${sequencial}${resto}${verificador}`) % BigInt(97) === BigInt(1);
}

export function formatarNumeroCnj(numero: string): string {
  const digitos = soDigitosDoNumero(numero);
  if (!VINTE_DIGITOS.test(digitos)) return numero;
  return digitos.replace(/(\d{7})(\d{2})(\d{4})(\d)(\d{2})(\d{4})/, "$1-$2.$3.$4.$5.$6");
}
