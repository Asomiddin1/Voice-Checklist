"use client";

import type React from 'react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus } from 'lucide-react';

interface ManualAddFormProps {
  onAddItem: (text: string) => void;
  disabled?: boolean;
}

const ManualAddForm: React.FC<ManualAddFormProps> = ({ onAddItem, disabled }) => {
  const [inputText, setInputText] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputText.trim()) {
      onAddItem(inputText.trim());
      setInputText('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex w-full space-x-2">
      <Input
        type="text"
        value={inputText}
        onChange={(e) => setInputText(e.target.value)}
        placeholder="Add a new task manually"
        className="flex-grow"
        disabled={disabled}
        aria-label="New task input"
      />
      <Button type="submit" disabled={disabled || !inputText.trim()} aria-label="Add task">
        <Plus className="h-4 w-4 mr-2 sm:mr-0 md:mr-2" />
        <span className="hidden sm:inline md:hidden lg:inline">Add</span>
      </Button>
    </form>
  );
};

export default ManualAddForm;
