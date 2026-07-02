export interface PhoneCountry {
  code: string;
  name: string;
  dialCode: string;
  flag: string;
  mask: string;
  nationalLength: number;
}

export const PHONE_COUNTRIES: PhoneCountry[] = [
  { code: 'BR', name: 'Brasil', dialCode: '55', flag: '🇧🇷', mask: '(00) 00000-0000', nationalLength: 11 },
  { code: 'AR', name: 'Argentina', dialCode: '54', flag: '🇦🇷', mask: '00 0000-0000', nationalLength: 10 },
  { code: 'PY', name: 'Paraguai', dialCode: '595', flag: '🇵🇾', mask: '000 000000', nationalLength: 9 },
  { code: 'UY', name: 'Uruguai', dialCode: '598', flag: '🇺🇾', mask: '00 000 000', nationalLength: 8 },
  { code: 'US', name: 'Estados Unidos', dialCode: '1', flag: '🇺🇸', mask: '(000) 000-0000', nationalLength: 10 },
  { code: 'PT', name: 'Portugal', dialCode: '351', flag: '🇵🇹', mask: '000 000 000', nationalLength: 9 },
  { code: 'ES', name: 'Espanha', dialCode: '34', flag: '🇪🇸', mask: '000 00 00 00', nationalLength: 9 },
  { code: 'MX', name: 'México', dialCode: '52', flag: '🇲🇽', mask: '00 0000 0000', nationalLength: 10 },
  { code: 'GB', name: 'Reino Unido', dialCode: '44', flag: '🇬🇧', mask: '0000 000000', nationalLength: 10 },
];

export const DEFAULT_PHONE_COUNTRY = PHONE_COUNTRIES[0];

export function getCountryByCode(code: string): PhoneCountry {
  return PHONE_COUNTRIES.find((country) => country.code === code) ?? DEFAULT_PHONE_COUNTRY;
}

export function detectCountryFromPhone(fullPhone: string): PhoneCountry {
  const digits = fullPhone.replace(/\D/g, '');
  if (!digits) return DEFAULT_PHONE_COUNTRY;

  const sorted = [...PHONE_COUNTRIES].sort((a, b) => b.dialCode.length - a.dialCode.length);
  return sorted.find((country) => digits.startsWith(country.dialCode)) ?? DEFAULT_PHONE_COUNTRY;
}

export function getNationalDigits(fullPhone: string, country: PhoneCountry): string {
  const digits = fullPhone.replace(/\D/g, '');
  if (digits.startsWith(country.dialCode)) {
    return digits.slice(country.dialCode.length, country.dialCode.length + country.nationalLength);
  }
  return digits.slice(0, country.nationalLength);
}

export function buildInternationalPhone(country: PhoneCountry, nationalDigits: string): string {
  return `${country.dialCode}${nationalDigits}`;
}

export function applyPhoneMask(nationalDigits: string, mask: string): string {
  let result = '';
  let digitIndex = 0;

  for (const char of mask) {
    if (char === '0') {
      if (digitIndex >= nationalDigits.length) break;
      result += nationalDigits[digitIndex];
      digitIndex += 1;
    } else if (digitIndex < nationalDigits.length) {
      result += char;
    }
  }

  return result;
}
