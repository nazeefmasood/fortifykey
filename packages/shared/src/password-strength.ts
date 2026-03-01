import type { PasswordStrengthLabel } from "./types";

/**
 * Calculate a password strength score (0-100) and label.
 */
export function calculateStrength(password: string): {
  score: number;
  label: PasswordStrengthLabel;
} {
  if (!password) return { score: 0, label: "weak" };

  let score = 0;

  // Length scoring (up to 40 points)
  score += Math.min(password.length * 2.5, 40);

  // Character variety (up to 30 points)
  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasDigit = /\d/.test(password);
  const hasSpecial = /[^a-zA-Z0-9]/.test(password);

  const varieties = [hasLower, hasUpper, hasDigit, hasSpecial].filter(
    Boolean
  ).length;
  score += varieties * 7.5;

  // Unique characters bonus (up to 15 points)
  const uniqueRatio = new Set(password).size / password.length;
  score += uniqueRatio * 15;

  // Penalty for common patterns
  if (/^[a-zA-Z]+$/.test(password)) score -= 10; // letters only
  if (/^[0-9]+$/.test(password)) score -= 15; // numbers only
  if (/(.)\1{2,}/.test(password)) score -= 10; // repeated chars
  if (/^(123|abc|qwerty|password)/i.test(password)) score -= 20; // common starts

  // Bonus for length > 16
  if (password.length > 16) score += 15;

  score = Math.max(0, Math.min(100, Math.round(score)));

  let label: PasswordStrengthLabel;
  if (score >= 70) label = "strong";
  else if (score >= 40) label = "medium";
  else label = "weak";

  return { score, label };
}

/**
 * Get the color for a strength label (matches original RN app colors).
 */
export function strengthColor(label: PasswordStrengthLabel): string {
  switch (label) {
    case "strong":
      return "#4CAF50";
    case "medium":
      return "#FFA000";
    case "weak":
      return "#F44336";
  }
}
