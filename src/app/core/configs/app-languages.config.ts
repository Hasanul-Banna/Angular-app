export const APP_LANGUAGES = [
  { code: 'en', label: 'English', nativeLabel: 'English' },
  { code: 'bn', label: 'Bengali', nativeLabel: 'Bangla' },
  // { code: 'de', label: 'German', nativeLabel: 'Deutsch' },
  // { code: 'fr', label: 'French', nativeLabel: 'Francais' },
  // { code: 'it', label: 'Italian', nativeLabel: 'Italiano' },
] as const;

export type AppLanguage = (typeof APP_LANGUAGES)[number]['code'];

export const DEFAULT_APP_LANGUAGE: AppLanguage = 'en';

export function isAppLanguage(value: string): value is AppLanguage {
  return APP_LANGUAGES.some((language) => language.code === value);
}
