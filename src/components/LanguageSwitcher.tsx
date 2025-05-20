
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
import { Settings as IconSettings } from 'lucide-react'; // Changed from Globe

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
        <Button variant="ghost" size="icon" aria-label={t('settingsAriaLabel')}> {/* Changed variant and aria-label */}
          <IconSettings className="h-6 w-6" /> {/* Changed icon and size */}
          <span className="sr-only">{t('settingsAriaLabel')}</span> {/* Re-confirm SR text if needed */}
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
