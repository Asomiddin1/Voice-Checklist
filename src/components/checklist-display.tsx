
"use client";

import type React from 'react';
import ChecklistItemComponent from './checklist-item';
import type { ChecklistItemType } from '@/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useLanguage } from '@/contexts/LanguageContext';

interface ChecklistDisplayProps {
  items: ChecklistItemType[];
  onToggleItem: (id:string) => void;
  onDeleteItem: (id: string) => void;
  disabled?: boolean;
}

const ChecklistDisplay: React.FC<ChecklistDisplayProps> = ({ items, onToggleItem, onDeleteItem, disabled }) => {
  const { t } = useLanguage();
  if (items.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8">
        <p className="text-lg">{t('emptyChecklistMessage')}</p>
        <p className="text-sm">{t('emptyChecklistSubMessage')}</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[400px] w-full rounded-md border p-2 bg-background shadow-inner">
      <div className="space-y-3 p-2">
        {items.map((item) => (
          <ChecklistItemComponent
            key={item.id}
            item={item}
            onToggle={onToggleItem}
            onDelete={onDeleteItem}
            disabled={disabled}
          />
        ))}
      </div>
    </ScrollArea>
  );
};

export default ChecklistDisplay;
