
"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import VoiceRecorder from '@/components/voice-recorder';
import ManualAddForm from '@/components/manual-add-form';
import ChecklistDisplay from '@/components/checklist-display';
import type { ChecklistItemType } from '@/types';
import { speechToText, SpeechToTextInput } from '@/ai/flows/speech-to-text';
import { processVoiceCommand, ProcessVoiceCommandInput } from '@/ai/flows/process-voice-command';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { useLanguage } from '@/contexts/LanguageContext';
import { Loader2 as IconLoader } from 'lucide-react'; 
import VoiceCommandsModal from '@/components/voice-commands-modal';


async function blobToDataURI(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to convert blob to data URI.'));
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export default function VoiceChecklistPage() {
  const [items, setItems] = useState<ChecklistItemType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const [isMounted, setIsMounted] = useState(false);
  const { t, locale } = useLanguage(); 
  const [editingItemId, setEditingItemId] = useState<string | null>(null);

  useEffect(() => {
    setIsMounted(true);
    try {
      const storedItems = localStorage.getItem('checklistItems');
      if (storedItems) {
        setItems(JSON.parse(storedItems));
      }
    } catch (error) {
      console.error("Failed to load items from localStorage", error);
    }
  }, []);

  useEffect(() => {
    if (isMounted) {
      try {
        localStorage.setItem('checklistItems', JSON.stringify(items));
      } catch (error)
      {
        console.error("Failed to save items to localStorage", error);
      }
    }
  }, [items, isMounted]);


  const handleRecordingComplete = async (audioBlob: Blob) => {
    if (editingItemId) setEditingItemId(null); // Cancel edit mode if voice command starts
    setIsLoading(true);
    try {
      const audioDataUri = await blobToDataURI(audioBlob);
      
      const transcriptionInput: SpeechToTextInput = { audioDataUri };
      const transcriptionOutput = await speechToText(transcriptionInput);

      if (!transcriptionOutput.text || transcriptionOutput.text.trim() === "") {
        toast({
          title: t('emptyTranscriptionTitle'),
          description: t('emptyTranscriptionDescription'),
          variant: "default",
        });
        setIsLoading(false);
        return;
      }
      
      toast({
        title: t('transcriptionSuccessfulTitle'),
        description: t('transcriptionText', { text: transcriptionOutput.text.substring(0,50) }),
      });

      const commandInput: ProcessVoiceCommandInput = { 
        speechTranscription: transcriptionOutput.text,
        checklistItems: items 
      };
      const commandOutput = await processVoiceCommand(commandInput);

      let commandsProcessed = 0;
      let itemsAddedFromCommands = 0;
      let itemsToggled = 0;
      let itemsDeleted = 0;

      if (commandOutput.recognizedCommands && commandOutput.recognizedCommands.length > 0) {
        commandOutput.recognizedCommands.forEach(cmd => {
          commandsProcessed++;
          if (cmd.command === 'toggle' && cmd.targetItemId) {
            handleToggleItem(cmd.targetItemId, false); 
            itemsToggled++;
            toast({ title: t('commandProcessedToastTitle'), description: t('itemToggledToastDescription', {itemName: cmd.itemName})});
          } else if (cmd.command === 'delete' && cmd.targetItemId) {
            handleDeleteItem(cmd.targetItemId, false); 
            itemsDeleted++;
            toast({ title: t('commandProcessedToastTitle'), description: t('itemDeletedByVoiceToastDescription', {itemName: cmd.itemName})});
          } else if (cmd.command === 'add' && cmd.itemName) {
            addMultipleItems([cmd.itemName], false); 
            itemsAddedFromCommands++;
          }
        });
      }

      if (commandOutput.newItemsFromSpeech && commandOutput.newItemsFromSpeech.length > 0) {
        addMultipleItems(commandOutput.newItemsFromSpeech, false);
        itemsAddedFromCommands += commandOutput.newItemsFromSpeech.length;
      }
      
      if (itemsAddedFromCommands > 0) {
         toast({
          title: t('itemsAddedToastTitle'),
          description: t('itemsAddedToastDescription', {count: itemsAddedFromCommands}),
        });
      } else if (itemsToggled > 0 || itemsDeleted > 0) {
        // Individual toasts are fine.
      } else if (commandsProcessed === 0 && itemsAddedFromCommands === 0 ) {
         toast({
          title: t('noCommandsOrItemsFoundTitle'),
          description: t('noCommandsOrItemsFoundDescription'),
        });
      }

    } catch (error: any) {
      console.error('Error processing voice input:', error);
      toast({
        title: t('errorProcessingVoiceTitle'),
        description: error.message || t('unexpectedError'),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRecordingError = (errorMsgKey: string, params?: Record<string, string|number>) => {
    toast({
      title: t('recordingErrorTitle'),
      description: t(errorMsgKey, params),
      variant: "destructive",
    });
     setIsLoading(false);
  };

  const addMultipleItems = (texts: string[], showToast: boolean = true) => {
    if (editingItemId) setEditingItemId(null); 
    const newItems: ChecklistItemType[] = texts.map(text => ({
      id: crypto.randomUUID(),
      text,
      completed: false,
    }));
    setItems(prevItems => [...prevItems, ...newItems]);
    if (showToast && newItems.length === 1) {
       toast({
        title: t('itemAddedToastTitle'),
        description: t('itemAddedToastDescription', {itemText: newItems[0].text.substring(0,30)}),
      });
    } else if (showToast && newItems.length > 1) {
      toast({
        title: t('itemsAddedToastTitle'),
        description: t('itemsAddedToastDescription', {count: newItems.length}),
      });
    }
  };
  
  const handleAddItemManually = (text: string) => {
    addMultipleItems([text]);
  };

  const handleToggleItem = (id: string, showToast: boolean = true) => {
    if (editingItemId) setEditingItemId(null); 
    let itemName = "";
    setItems(prevItems =>
      prevItems.map(item => {
        if (item.id === id) {
          itemName = item.text;
          return { ...item, completed: !item.completed };
        }
        return item;
      })
    );
     if (showToast) {
        toast({
          title: t('itemToggledManuallyToastTitle'),
          description: t('itemToggledManuallyToastDescription', { itemName: itemName.substring(0,30) })
      });
    }
  };

  const handleDeleteItem = (id: string, showToast: boolean = true) => {
    if (editingItemId === id) setEditingItemId(null);
    setItems(prevItems => prevItems.filter(item => item.id !== id));
    if (showToast) {
      toast({
        title: t('itemDeletedToastTitle'),
        description: t('itemDeletedToastDescription'),
      });
    }
  };

  const handleStartEdit = (item: ChecklistItemType) => {
    setEditingItemId(item.id);
  };

  const handleSaveEditText = (id: string, newText: string) => {
    if (!newText.trim()) {
      toast({
        title: t('itemTextCannotBeEmptyTitle'),
        description: t('itemTextCannotBeEmptyDescription'),
        variant: 'destructive',
      });
      setEditingItemId(null); // Exit edit mode if text is empty
      return;
    }
    setItems(prevItems =>
      prevItems.map(item => (item.id === id ? { ...item, text: newText.trim() } : item))
    );
    setEditingItemId(null);
    toast({
      title: t('itemUpdatedToastTitle'),
      description: t('itemUpdatedToastDescription', { itemText: newText.substring(0, 30) }),
    });
  };

  const handleCancelEdit = () => {
    setEditingItemId(null);
  };
  
  if (!isMounted || !t('voiceChecklistTitle')) { 
     return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4 md:p-8 bg-gradient-to-br from-background to-secondary">
        <IconLoader className="h-16 w-16 animate-spin text-primary" />
        <p className="mt-4 text-lg text-foreground">{t('loadingChecklist')}</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-start p-4 md:p-8 bg-gradient-to-br from-background to-secondary">
      <div className="w-full max-w-2xl mb-4 flex justify-end">
        <LanguageSwitcher />
      </div>
      <Card className="w-full max-w-2xl shadow-2xl rounded-xl overflow-hidden">
        <CardHeader className="bg-primary text-primary-foreground text-center p-6">
          <CardTitle className="text-3xl font-bold tracking-tight">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="inline-block mr-2 mb-1"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" x2="12" y1="19" y2="22"></line></svg>
            {t('voiceChecklistTitle')}
          </CardTitle>
          <CardDescription className="text-primary-foreground/80 text-sm">
            {t('voiceChecklistDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <div className="p-4 border border-dashed border-border rounded-lg bg-muted/20 space-y-3">
             <VoiceRecorder 
                onRecordingComplete={handleRecordingComplete} 
                onRecordingError={handleRecordingError}
                isProcessing={isLoading}
             />
             <div className="flex justify-center">
                <VoiceCommandsModal />
             </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Separator className="flex-grow" />
            <span className="text-xs text-muted-foreground font-medium">{t('orSeparator')}</span>
            <Separator className="flex-grow" />
          </div>

          <ManualAddForm onAddItem={handleAddItemManually} disabled={isLoading || !!editingItemId} />
          
          <Separator />

          <ChecklistDisplay
            items={items}
            onToggleItem={handleToggleItem}
            onDeleteItem={handleDeleteItem}
            onStartEdit={handleStartEdit}
            onSaveEditText={handleSaveEditText}
            onCancelEdit={handleCancelEdit}
            editingItemId={editingItemId}
            disabled={isLoading}
          />
        </CardContent>
      </Card>
       <footer className="mt-8 text-center text-sm text-muted-foreground">
        <p>{t('footerText', { year: new Date().getFullYear() })}</p>
      </footer>
    </div>
  );
}
