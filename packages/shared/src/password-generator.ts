import type { GeneratorConfig } from "./types";

const LETTERS = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
const SPECIALS = "!@#$%^&*()_+-=[]{}|;:,.<>?";
const NUMBERS = "0123456789";

/**
 * Generate a cryptographically random password based on slider configuration.
 *
 * - `length`: total number of characters (from radial slider, 1-100)
 * - `wordPercentage`: ratio of letter characters (0-100)
 * - `specialPercentage`: ratio of special characters (0-100)
 * - `numberPercentage`: ratio of number characters (0-100)
 *
 * The three percentages are normalized to determine character counts.
 */
export function generatePassword(config: GeneratorConfig): string {
  const { length, wordPercentage, specialPercentage, numberPercentage } =
    config;

  if (length <= 0) return "";

  const totalParts = wordPercentage + specialPercentage + numberPercentage;

  // If all sliders are at 0, default to all letters
  if (totalParts === 0) {
    return randomChars(LETTERS, length);
  }

  // Compute character counts from ratios
  const letterCount = Math.round((wordPercentage / totalParts) * length);
  const specialCount = Math.round((specialPercentage / totalParts) * length);
  const numberCount = Math.max(0, length - letterCount - specialCount);

  // Build character array
  const chars: string[] = [
    ...randomChars(LETTERS, letterCount).split(""),
    ...randomChars(SPECIALS, specialCount).split(""),
    ...randomChars(NUMBERS, numberCount).split(""),
  ];

  // Trim or pad to exact length (rounding may cause off-by-one)
  while (chars.length > length) chars.pop();
  while (chars.length < length) chars.push(randomChar(LETTERS));

  // Fisher-Yates shuffle
  shuffle(chars);

  return chars.join("");
}

/**
 * Classify a character for colored display.
 */
export function classifyChar(
  char: string
): "letter" | "number" | "special" {
  if (NUMBERS.includes(char)) return "number";
  if (LETTERS.includes(char)) return "letter";
  return "special";
}

// ===== Helpers =====

function randomChars(charset: string, count: number): string {
  if (count <= 0) return "";
  const arr = new Uint32Array(count);
  crypto.getRandomValues(arr);
  return Array.from(arr, (v) => charset[v % charset.length]!).join("");
}

function randomChar(charset: string): string {
  return randomChars(charset, 1);
}

function shuffle(arr: string[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = cryptoRandomInt(i + 1);
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
}

function cryptoRandomInt(max: number): number {
  const arr = new Uint32Array(1);
  crypto.getRandomValues(arr);
  return arr[0]! % max;
}
