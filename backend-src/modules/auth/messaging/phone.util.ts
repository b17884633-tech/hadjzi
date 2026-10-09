/** Normalize to E.164 with leading +. Digits-only Meta WhatsApp "to" omits +. */
export function toE164(phone: string): string {
  const trimmed = phone.trim();
  if (trimmed.startsWith('+')) {
    return `+${trimmed.slice(1).replace(/\D/g, '')}`;
  }
  return `+${trimmed.replace(/\D/g, '')}`;
}

export function digitsOnly(phone: string): string {
  return toE164(phone).replace(/\D/g, '');
}
