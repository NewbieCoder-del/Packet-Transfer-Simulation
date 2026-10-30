import type { StateCreator } from 'zustand';
import type { Locale, Translations } from '../i18n';
import { getSavedLocale, saveLocale, getTranslations, interpolate } from '../i18n';

export interface I18nSlice {
  locale: Locale;
  t: Translations;
  setLocale: (locale: Locale) => void;
  tf: (key: keyof Translations, params: Record<string, string | number>) => string;
}

const initialLocale = getSavedLocale();

export const createI18nSlice: StateCreator<I18nSlice, [], [], I18nSlice> = (set, get) => ({
  locale: initialLocale,
  t: getTranslations(initialLocale),

  setLocale: (locale) => {
    saveLocale(locale);
    set({ locale, t: getTranslations(locale) });
    document.documentElement.lang = locale;
    document.title = getTranslations(locale)['app.title'];
  },

  tf: (key, params) => interpolate(get().t[key], params),
});
