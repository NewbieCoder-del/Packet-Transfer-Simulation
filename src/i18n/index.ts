import { en } from './en';
import { ko } from './ko';
import type { Locale, Translations } from './types';

export type { Locale, Translations };

const messages: Record<Locale, Translations> = { en, ko };

const STORAGE_KEY = 'network-simulator-locale';

export function getSavedLocale(): Locale {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved === 'en' || saved === 'ko') return saved;
  const browserLang = navigator.language.slice(0, 2);
  if (browserLang === 'ko') return 'ko';
  return 'en';
}

export function saveLocale(locale: Locale): void {
  localStorage.setItem(STORAGE_KEY, locale);
}

export function getTranslations(locale: Locale): Translations {
  return messages[locale];
}

export function interpolate(
  template: string,
  params: Record<string, string | number>,
): string {
  return template.replace(/\{(\w+)\}/g, (_, key) =>
    key in params ? String(params[key]) : `{${key}}`
  );
}

export const AVAILABLE_LOCALES: { code: Locale; label: string }[] = [
  { code: 'en', label: 'EN' },
  { code: 'ko', label: 'KO' },
];
