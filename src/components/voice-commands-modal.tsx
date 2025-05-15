
"use client";

import type React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose, // Import DialogClose
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useLanguage } from '@/contexts/LanguageContext';
import { HelpCircle, Info } from 'lucide-react';

const VoiceCommandsModal: React.FC = () => {
  const { t } = useLanguage();

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Info className="h-4 w-4" />
          {t('showCommandsButton')}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HelpCircle className="h-6 w-6 text-primary" />
            {t('voiceCommandsModalTitle')}
          </DialogTitle>
          <DialogDescription>
            {t('voiceCommandsModalDescription')}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4 text-sm max-h-[60vh] overflow-y-auto pr-2">
          <div>
            <h4 className="font-semibold text-foreground mb-1">{t('commandCategoryAdd')}</h4>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground pl-4">
              <li>{t('commandAddExample1')}</li>
              <li>{t('commandAddExample2')}</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-foreground mb-1">{t('commandCategoryToggle')}</h4>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground pl-4">
              <li>{t('commandToggleExample1')}</li>
              <li>{t('commandToggleExample2')}</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-foreground mb-1">{t('commandCategoryDelete')}</h4>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground pl-4">
              <li>{t('commandDeleteExample1')}</li>
            </ul>
          </div>
        </div>
        <DialogFooter className="sm:justify-start">
          <DialogClose asChild>
            <Button type="button" variant="secondary">
              {t('closeButton')}
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default VoiceCommandsModal;
