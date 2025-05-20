
"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
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
import { Loader2 as IconLoader, Plus as IconPlus, Save as IconSave } from 'lucide-react';
import VoiceCommandsModal from '@/components/voice-commands-modal';
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";


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
  const [isModalOpen, setIsModalOpen] = useState(false);

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

  const handleSaveToLocalStorage = () => {
    try {
      localStorage.setItem('checklistItems', JSON.stringify(items));
      toast({
        title: t('saveChecklistSuccessTitle'),
        description: t('saveChecklistSuccessDescription'),
      });
    } catch (error) {
      console.error("Failed to save items to localStorage explicitly", error);
      toast({
        title: t('errorProcessingVoiceTitle'), 
        description: t('unexpectedError'),
        variant: "destructive",
      });
    }
  };


  const handleRecordingComplete = async (audioBlob: Blob) => {
    if (editingItemId) setEditingItemId(null);
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
    setItems(prevItems => [...newItems, ...prevItems]); 
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
      setEditingItemId(null);
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
    <div className="relative min-h-screen bg-gradient-to-br from-background to-secondary flex items-center justify-center p-4">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="lg"
              className="fixed bottom-8 left-8 h-16 w-16 rounded-full p-0 shadow-xl hover:shadow-2xl transition-shadow z-50"
              aria-label={t('saveChecklistButton')}
              onClick={handleSaveToLocalStorage}
            >
              <IconSave className="h-8 w-8" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right" sideOffset={10}>
            <p>{t('saveChecklistButtonTooltip')}</p>
          </TooltipContent>
        </Tooltip>

        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <Tooltip>
            <TooltipTrigger asChild>
              <DialogTrigger asChild>
                <Button
                  variant="default"
                  size="lg"
                  className="fixed bottom-8 right-8 h-16 w-16 rounded-full p-0 shadow-xl hover:shadow-2xl transition-shadow"
                  aria-label={t('openChecklistAppButton')}
                >
                  <IconPlus className="h-8 w-8" />
                </Button>
              </DialogTrigger>
            </TooltipTrigger>
            <TooltipContent side="left" sideOffset={10}>
              <p>{t('openChecklistAppButton')}</p>
            </TooltipContent>
          </Tooltip>
          
          <DialogContent className="w-[95vw] max-w-4xl h-[90vh] p-0 flex flex-col overflow-hidden rounded-xl shadow-2xl">
            {/* Navbar area */}
            <div className="flex-shrink-0 p-4 flex justify-between items-center border-b bg-muted/30">
              <div className="invisible"> {/* Placeholder for left side if needed */}
                <LanguageSwitcher />
              </div>
              <h2 className="text-lg font-semibold text-foreground">{t('voiceChecklistTitle')}</h2>
              <LanguageSwitcher />
            </div>

            <div className="flex-grow overflow-y-auto">
              <Card className="w-full h-full shadow-none border-none rounded-none flex flex-col">
                <CardHeader className="bg-primary text-primary-foreground text-center p-6 flex-shrink-0">
                  {/* Title moved to modal navbar, description can remain or be removed */}
                  <CardDescription className="text-primary-foreground/80 text-sm">
                    {t('voiceChecklistDescription')}
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 md:p-6 space-y-6 flex-grow">
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
                <CardFooter className="flex-shrink-0 p-4 border-t flex flex-col sm:flex-row justify-center items-center space-y-2 sm:space-y-0">
                  {/* Save button moved to main page */}
                  <p className="text-center text-xs text-muted-foreground">
                    {t('footerText', { year: new Date().getFullYear() })}
                  </p>
                </CardFooter>
              </Card>
            </div>
          </DialogContent>
        </Dialog>
      </TooltipProvider>
    </div>
  );
}

