/** Decimal keyboard input in Brazilian Portuguese; rejects partially valid values. */
export function decimal(value: string): number | undefined {
  const text = value.trim().replace(',', '.');
  if (!/^\d+(\.\d+)?$/.test(text)) return undefined;
  const number = Number(text);
  return Number.isFinite(number) ? number : undefined;
}

export const validEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

export function passwordError(password: string) {
  if (password.length < 8) return 'Use pelo menos 8 caracteres.';
  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password)) {
    return 'Inclua uma letra maiúscula, uma minúscula e um número.';
  }
  return '';
}
