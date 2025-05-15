"use client";

import type React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import type { ChecklistItemType } from '@/types';
import { cn } from '@/lib/utils';

interface ChecklistItemProps {
  item: ChecklistItemType;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  disabled?: boolean;
}

const ChecklistItemComponent: React.FC<ChecklistItemProps> = ({ item, onToggle, onDelete, disabled }) => {
  return (
    <div className="flex items-center space-x-3 p-3 bg-card rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200">
      <Checkbox
        id={`checkbox-${item.id}`}
        checked={item.completed}
        onCheckedChange={() => onToggle(item.id)}
        className="transition-transform duration-200 ease-in-out transform scale-110 data-[state=checked]:bg-accent data-[state=checked]:border-accent-foreground"
        disabled={disabled}
        aria-labelledby={`item-text-${item.id}`}
      />
      <label
        htmlFor={`checkbox-${item.id}`}
        id={`item-text-${item.id}`}
        className={cn(
          "flex-grow text-sm cursor-pointer break-words",
          item.completed ? "line-through text-muted-foreground" : "text-foreground",
          disabled && "opacity-50"
        )}
      >
        {item.text}
      </label>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onDelete(item.id)}
        className="text-muted-foreground hover:text-destructive"
        disabled={disabled}
        aria-label={`Delete task ${item.text}`}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
};

export default ChecklistItemComponent;
