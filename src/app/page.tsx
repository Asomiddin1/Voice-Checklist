
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
// import { checklistAutoGenerator, ChecklistAutoGeneratorInput } from '@/ai/flows/checklist-auto-generator'; // Replaced by processVoiceCommand
import { processVoiceCommand, ProcessVoiceCommandInput } from '@/ai/flows/process-voice-command';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { useLanguage } from '@/contexts/LanguageContext';
import { AlertTriangle, Loader2 as IconLoader } from 'lucide-react'; // Renamed Loader2 to avoid conflict


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
  const { t, locale } = useLanguage(); // Get t function and current locale

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

      if (commandOutput.recognizedCommands && commandOutput.recognizedCommands.length > 0) {
        commandOutput.recognizedCommands.forEach(cmd => {
          commandsProcessed++;
          if (cmd.command === 'toggle' && cmd.targetItemId) {
            handleToggleItem(cmd.targetItemId, false); // silent toggle, toast later
            toast({ title: t('commandProcessedToastTitle'), description: t('itemToggledToastDescription', {itemName: cmd.itemName})});
          } else if (cmd.command === 'delete' && cmd.targetItemId) {
            handleDeleteItem(cmd.targetItemId, false); // silent delete, toast later
            toast({ title: t('commandProcessedToastTitle'), description: t('itemDeletedByVoiceToastDescription', {itemName: cmd.itemName})});
          } else if (cmd.command === 'add' && cmd.itemName) {
            addMultipleItems([cmd.itemName], false); // silent add, toast later
            toast({ title: t('commandProcessedToastTitle'), description: t('itemAddedByVoiceToastDescription', {itemName: cmd.itemName})});
            itemsAddedFromCommands++;
          }
        });
      }

      if (commandOutput.newItemsFromSpeech && commandOutput.newItemsFromSpeech.length > 0) {
        addMultipleItems(commandOutput.newItemsFromSpeech, false); // silent add
        itemsAddedFromCommands += commandOutput.newItemsFromSpeech.length;
      }
      
      if (commandsProcessed > 0 && itemsAddedFromCommands === 0 && commandOutput.newItemsFromSpeech.length === 0) {
         // Only commands like toggle/delete happened
      } else if (itemsAddedFromCommands > 0) {
         toast({
          title: t('itemsAddedToastTitle'),
          description: t('itemsAddedToastDescription', {count: itemsAddedFromCommands}),
        });
      } else if (commandsProcessed === 0 && commandOutput.newItemsFromSpeech.length === 0) {
         toast({
          title: t('noCommandsOrItemsFound'),
          description: t('noCommandsOrItemsFound'),
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
    setItems(prevItems =>
      prevItems.map(item =>
        item.id === id ? { ...item, completed: !item.completed } : item
      )
    );
    // Toast for toggle is handled by voice command processor if applicable
  };

  const handleDeleteItem = (id: string, showToast: boolean = true) => {
    setItems(prevItems => prevItems.filter(item => item.id !== id));
    if (showToast) {
      toast({
        title: t('itemDeletedToastTitle'),
        description: t('itemDeletedToastDescription'),
      });
    }
  };
  
  if (!isMounted || !t('voiceChecklistTitle')) { // Wait for translations too
     return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4 md:p-8 bg-gradient-to-br from-background to-secondary">
        <IconLoader className="h-16 w-16 animate-spin text-primary" />
        <p className="mt-4 text-lg text-foreground">Loading Checklist...</p>
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
          <div className="p-4 border border-dashed border-border rounded-lg bg-muted/20">
             <VoiceRecorder 
                onRecordingComplete={handleRecordingComplete} 
                onRecordingError={handleRecordingError}
                isProcessing={isLoading}
             />
          </div>
          
          <div className="flex items-center space-x-2">
            <Separator className="flex-grow" />
            <span className="text-xs text-muted-foreground font-medium">{t('orSeparator')}</span>
            <Separator className="flex-grow" />
          </div>

          <ManualAddForm onAddItem={handleAddItemManually} disabled={isLoading} />
          
          <Separator />

          <ChecklistDisplay
            items={items}
            onToggleItem={handleToggleItem}
            onDeleteItem={handleDeleteItem}
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

// Custom Loader2 component for initial loading screen (renamed to IconLoader to avoid conflicts)
const Loader2 = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
  </svg>
);
