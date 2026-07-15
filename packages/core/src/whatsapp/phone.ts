/**
 * Normalizes a Brazilian phone number to the E.164 format Meta's WhatsApp
 * Cloud API requires (e.g. "+5511999998888"). Returns null if the number
 * doesn't look like a valid Brazilian mobile/landline number.
 */
export function normalizeWhatsappPhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return null;

  // Already has the country code (55 + DDD + number = 12 or 13 digits).
  if (digits.startsWith("55") && (digits.length === 12 || digits.length === 13)) {
    return `+${digits}`;
  }

  // Local number: DDD + number, no country code (10 or 11 digits).
  if (digits.length === 10 || digits.length === 11) {
    return `+55${digits}`;
  }

  return null;
}
