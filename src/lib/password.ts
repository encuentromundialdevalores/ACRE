import { randomInt } from "node:crypto";

/** Contraseña temporal legible (sin caracteres ambiguos): 12 caracteres con letras, números y un símbolo. */
export function temporaryPassword() {
  const alpha = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz", digits = "23456789", symbols = "!#$%*?";
  const pick = (set: string, n: number) => Array.from({ length: n }, () => set[randomInt(set.length)]).join("");
  return `${pick(alpha, 4)}-${pick(digits, 4)}-${pick(alpha, 2)}${pick(symbols, 1)}`;
}
