// CPF e CNPJ: só dígitos no banco, máscara na tela.

export function soDigitos(texto: string): string {
  return texto.replace(/\D/g, "");
}

function digitoVerificador(digitos: string, pesos: readonly number[]): number {
  const soma = pesos.reduce((total, peso, i) => total + Number(digitos[i]) * peso, 0);
  const resto = soma % 11;
  return resto < 2 ? 0 : 11 - resto;
}

function cpfValido(cpf: string): boolean {
  if (/^(\d)\1{10}$/.test(cpf)) return false;
  const primeiro = digitoVerificador(cpf, [10, 9, 8, 7, 6, 5, 4, 3, 2]);
  const segundo = digitoVerificador(cpf, [11, 10, 9, 8, 7, 6, 5, 4, 3, 2]);
  return primeiro === Number(cpf[9]) && segundo === Number(cpf[10]);
}

function cnpjValido(cnpj: string): boolean {
  if (/^(\d)\1{13}$/.test(cnpj)) return false;
  const primeiro = digitoVerificador(cnpj, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const segundo = digitoVerificador(cnpj, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  return primeiro === Number(cnpj[12]) && segundo === Number(cnpj[13]);
}

/** Aceita CPF (11 dígitos) ou CNPJ (14), com ou sem máscara. */
export function documentoValido(texto: string): boolean {
  const digitos = soDigitos(texto);
  if (digitos.length === 11) return cpfValido(digitos);
  if (digitos.length === 14) return cnpjValido(digitos);
  return false;
}

export function formatarDocumento(digitos: string): string {
  if (digitos.length === 11) return digitos.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  if (digitos.length === 14) return digitos.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
  return digitos;
}

/** Telefone brasileiro em dígitos, com DDI 55, para o link `wa.me`. `null` se não der para montar. */
export function telefoneParaWhatsApp(telefone: string): string | null {
  const digitos = soDigitos(telefone);
  if (digitos.length === 10 || digitos.length === 11) return `55${digitos}`;
  if ((digitos.length === 12 || digitos.length === 13) && digitos.startsWith("55")) return digitos;
  return null;
}
