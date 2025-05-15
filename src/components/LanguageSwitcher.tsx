
"use client";

import type React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import type { Locale } from '@/types';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Globe } from 'lucide-react';

const LanguageSwitcher: React.FC = () => {
  const { locale, setLocale, t } = useLanguage();

  const languages: { code: Locale; nameKey: string }[] = [
    { code: 'en', nameKey: 'switchToEnglish' },
    { code: 'ru', nameKey: 'switchToRussian' },
    { code: 'ja', nameKey: 'switchToJapanese' },
    { code: 'uz', nameKey: 'switchToUzbek' },
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon">
          <Globe className="h-5 w-5" />
          <span className="sr-only">{t('changeLanguage')}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {languages.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => setLocale(lang.code)}
            disabled={locale === lang.code}
          >
            {t(lang.nameKey)}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default LanguageSwitcher;
