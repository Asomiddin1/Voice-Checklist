
"use client";

import type React from 'react';
import { useState, useEffect } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Trash2, Pencil, Check, X } from 'lucide-react';
import type { ChecklistItemType } from '@/types';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';

interface ChecklistItemProps {
  item: ChecklistItemType;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onStartEdit: (item: ChecklistItemType) => void;
  onSaveEditText: (id: string, newText: string) => void;
  onCancelEdit: () => void;
  editingItemId: string | null;
  disabled?: boolean;
}

const ChecklistItemComponent: React.FC<ChecklistItemProps> = ({ 
  item, 
  onToggle, 
  onDelete,
  onStartEdit,
  onSaveEditText,
  onCancelEdit,
  editingItemId,
  disabled 
}) => {
  const { t } = useLanguage();
  const isEditing = editingItemId === item.id;
  const [currentEditText, setCurrentEditText] = useState(item.text);

  useEffect(() => {
    if (isEditing) {
      setCurrentEditText(item.text);
    }
  }, [isEditing, item.text]);

  const handleSave = () => {
    if (currentEditText.trim()) {
      onSaveEditText(item.id, currentEditText.trim());
    } else {
      // Optionally, provide feedback that empty text is not allowed or auto-cancel
      onCancelEdit(); // Or show a toast from parent
    }
  };

  const handleKeyPress = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      handleSave();
    } else if (event.key === 'Escape') {
      onCancelEdit();
    }
  };

  return (
    <div className={cn(
      "flex items-center space-x-3 p-3 bg-card rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200",
      isEditing && "ring-2 ring-primary"
    )}>
      <Checkbox
        id={`checkbox-${item.id}`}
        checked={item.completed}
        onCheckedChange={() => onToggle(item.id)}
        className="transition-transform duration-200 ease-in-out transform scale-110 data-[state=checked]:bg-accent data-[state=checked]:border-accent-foreground"
        disabled={disabled || isEditing}
        aria-labelledby={`item-text-${item.id}`}
      />
      {isEditing ? (
        <Input
          type="text"
          value={currentEditText}
          onChange={(e) => setCurrentEditText(e.target.value)}
          onKeyDown={handleKeyPress}
          className="flex-grow text-sm h-8"
          autoFocus
          aria-label={t('editItemInputAriaLabel', { taskText: item.text })}
        />
      ) : (
        <label
          htmlFor={`checkbox-${item.id}`}
          id={`item-text-${item.id}`}
          className={cn(
            "flex-grow text-sm cursor-pointer break-words",
            item.completed ? "line-through text-muted-foreground" : "text-foreground",
            (disabled || isEditing) && "opacity-50"
          )}
          // Optional: Make label clickable to start edit if not completed and not disabled
          // onClick={() => !disabled && !isEditing && onStartEdit(item) }
        >
          {item.text}
        </label>
      )}
      
      <div className="flex space-x-1">
        {isEditing ? (
          <>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSave}
              className="text-green-600 hover:text-green-700"
              disabled={disabled}
              aria-label={t('saveButtonAriaLabel')}
            >
              <Check className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onCancelEdit}
              className="text-red-600 hover:text-red-700"
              disabled={disabled}
              aria-label={t('cancelButtonAriaLabel')}
            >
              <X className="h-4 w-4" />
            </Button>
          </>
        ) : (
          <>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onStartEdit(item)}
              className="text-muted-foreground hover:text-primary"
              disabled={disabled}
              aria-label={t('editButtonAriaLabel', { taskText: item.text })}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDelete(item.id)}
              className="text-muted-foreground hover:text-destructive"
              disabled={disabled}
              aria-label={t('deleteTaskAriaLabel', { taskText: item.text })}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </>
        )}
      </div>
    </div>
  );
};

export default ChecklistItemComponent;
