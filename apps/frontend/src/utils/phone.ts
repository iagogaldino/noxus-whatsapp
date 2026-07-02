export function normalizePhoneInput(value?: string | null): string {
  return (value ?? '').replace(/\D/g, '');
}

export function isValidWhatsAppPhone(phone?: string | null): boolean {
  const digits = normalizePhoneInput(phone);
  return digits.length >= 10 && digits.length <= 15;
}

export function formatPhoneLabel(phone?: string | null): string {
  const digits = normalizePhoneInput(phone);
  if (!digits) return '—';
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `+${digits}`;
  if (digits.length <= 6) return `+${digits.slice(0, 2)} ${digits.slice(2)}`;
  if (digits.length <= 10) {
    return `+${digits.slice(0, 2)} ${digits.slice(2, 4)} ${digits.slice(4)}`;
  }
  return `+${digits.slice(0, 2)} ${digits.slice(2, 4)} ${digits.slice(4, 9)}-${digits.slice(9)}`;
}
