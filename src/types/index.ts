export interface ChecklistItemType {
  id: string;
  text: string;
  completed: boolean;
}

export type Locale = 'en' | 'ru' | 'ja' | 'uz';

export interface Translations {
  [key: string]: string | ((params: Record<string, string | number>) => string);
}
