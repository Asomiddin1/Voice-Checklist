
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
import { Loader2 as IconLoader, Plus as IconPlus, Save as IconSave, Folder as IconFolder, List as IconList, CheckSquare as IconCheckSquare, Pencil as IconPencil } from 'lucide-react';
import VoiceCommandsModal from '@/components/voice-commands-modal';
import { Dialog, DialogContent, DialogTrigger, DialogHeader as DialogPrimitiveHeader, DialogTitle as DialogPrimitiveTitle, DialogDescription as DialogPrimitiveDescription, DialogFooter as DialogPrimitiveFooter, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const LOCALSTORAGE_ALL_LISTS_KEY = 'voiceChecklistApp_allLists';
const LOCALSTORAGE_LAST_ACTIVE_LIST_KEY = 'voiceChecklistApp_lastActiveListName';

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
  const { t } = useLanguage();
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  
  const [isMainModalOpen, setIsMainModalOpen] = useState(false);
  const [isNameInputModalOpen, setIsNameInputModalOpen] = useState(false);
  const [newListNameInput, setNewListNameInput] = useState('');
  const [activeListName, setActiveListName] = useState<string | null>(null);
  
  const [showListOnMainPage, setShowListOnMainPage] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    try {
      const storedLastActiveListName = localStorage.getItem(LOCALSTORAGE_LAST_ACTIVE_LIST_KEY);
      const storedAllLists = localStorage.getItem(LOCALSTORAGE_ALL_LISTS_KEY);
      
      let allLists: Record<string, ChecklistItemType[]> = {};
      if (storedAllLists) {
        allLists = JSON.parse(storedAllLists);
      }

      let listToLoadName = storedLastActiveListName;

      if (!listToLoadName && Object.keys(allLists).length > 0) {
        listToLoadName = Object.keys(allLists)[0]; 
      }
      
      if (listToLoadName && allLists[listToLoadName]) {
        setActiveListName(listToLoadName);
        setItems(allLists[listToLoadName]);
        if (allLists[listToLoadName].length > 0) {
            setShowListOnMainPage(true);
        } else {
            setShowListOnMainPage(true); 
        }
      } else {
        setShowListOnMainPage(false);
        setActiveListName(null);
        setItems([]);
      }
    } catch (error) {
      console.error("Failed to load data from localStorage", error);
      setShowListOnMainPage(false);
      setActiveListName(null);
      setItems([]);
    }
  }, []);

  const handleSaveToLocalStorage = () => {
    if (activeListName === null) { 
      toast({ title: t('errorText'), description: t('listMustBeNamedToSaveError'), variant: "destructive" });
      return;
    }
    if (!activeListName) { 
      toast({ title: t('errorText'), description: t('activeListNameMissingError'), variant: "destructive" });
      return;
    }
    try {
      const storedAllLists = localStorage.getItem(LOCALSTORAGE_ALL_LISTS_KEY);
      let allLists: Record<string, ChecklistItemType[]> = {};
      if (storedAllLists) {
        allLists = JSON.parse(storedAllLists);
      }
      allLists[activeListName] = items;
      localStorage.setItem(LOCALSTORAGE_ALL_LISTS_KEY, JSON.stringify(allLists));
      localStorage.setItem(LOCALSTORAGE_LAST_ACTIVE_LIST_KEY, activeListName);

      toast({
        title: t('saveChecklistSuccessTitle'),
        description: t('saveChecklistSuccessDescription', { listName: activeListName }),
      });
      
      setShowListOnMainPage(true); 
      setIsMainModalOpen(false); 
      setEditingItemId(null);
    } catch (error) {
      console.error("Failed to save items to localStorage", error);
      toast({
        title: t('errorProcessingVoiceTitle'), 
        description: t('unexpectedError'),
        variant: "destructive",
      });
    }
  };

  const handleFABClick = () => {
    setActiveListName(null); 
    setItems([]);
    setNewListNameInput(''); 
    setShowListOnMainPage(true); 
    setIsMainModalOpen(false);
    setIsNameInputModalOpen(false); 
  };
  
  const handleMainPageListCardClick = () => {
    if (activeListName === null) { 
      setNewListNameInput(''); 
      setIsNameInputModalOpen(true);
    } else { 
      openMainModalForCurrentList();
    }
  };


  const handleCreateAndOpenNewList = () => {
    if (!newListNameInput.trim()) {
      toast({ title: t('errorText'), description: t('listNameCannotBeEmptyError'), variant: 'destructive'});
      return;
    }
    const newName = newListNameInput.trim();
    
    const storedAllLists = localStorage.getItem(LOCALSTORAGE_ALL_LISTS_KEY);
    let allLists: Record<string, ChecklistItemType[]> = {};
    if (storedAllLists) {
        allLists = JSON.parse(storedAllLists);
    }

    if (allLists[newName]) {
        setItems(allLists[newName]);
        toast({ title: t('openingExistingListTitle'), description: t('openingExistingListDescription', { listName: newName }) });
    } else {
        setItems([]);
    }
    
    setActiveListName(newName);
    setNewListNameInput('');
    setIsNameInputModalOpen(false);
    setIsMainModalOpen(true); 
    setShowListOnMainPage(true); 
  };

  const openMainModalForCurrentList = () => {
    if (activeListName) {
        const storedAllLists = localStorage.getItem(LOCALSTORAGE_ALL_LISTS_KEY);
        let allLists: Record<string, ChecklistItemType[]> = {};
        if (storedAllLists) {
            allLists = JSON.parse(storedAllLists);
        }
        setItems(allLists[activeListName] || []);
    } else {
        console.warn("Attempted to open main modal without an active list name for an existing list.");
        setIsNameInputModalOpen(true); 
        return;
    }
    setEditingItemId(null);
    setIsMainModalOpen(true);
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
    let itemText = "";
    setItems(prevItems => {
        const itemToDelete = prevItems.find(item => item.id === id);
        if (itemToDelete) itemText = itemToDelete.text;
        const newItems = prevItems.filter(item => item.id !== id);
        return newItems;
    });
    if (showToast && itemText) { 
      toast({
        title: t('itemDeletedToastTitle'),
        description: t('itemDeletedToastDescriptionWithText', { itemText: itemText.substring(0, 30) }),
      });
    } else if (showToast) {
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
  
  const handleEditItemFromMainPage = (itemToEdit: ChecklistItemType) => {
    if (activeListName === null) {
        toast({ title: t('errorText'), description: t('nameNewListBeforeEditError'), variant: 'destructive'});
        setIsNameInputModalOpen(true);
        return;
    }
    if (activeListName) {
        const storedAllLists = localStorage.getItem(LOCALSTORAGE_ALL_LISTS_KEY);
        let allLists: Record<string, ChecklistItemType[]> = {};
        if (storedAllLists) {
            allLists = JSON.parse(storedAllLists);
        }
        if (allLists[activeListName]) {
            setItems(allLists[activeListName]); 
        }
        
        handleStartEdit(itemToEdit);
        setIsMainModalOpen(true);
    } else {
        toast({ title: t('errorText'), description: t('cannotEditNoActiveListError'), variant: 'destructive' });
    }
  };


  if (!isMounted || !t('voiceChecklistTitle')) { 
     return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4 md:p-8 bg-background">
        <IconLoader className="h-16 w-16 animate-spin text-primary" />
        <p className="mt-4 text-lg text-foreground">{t('loadingChecklist')}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="p-4 flex justify-between items-center">
        <h1 className="text-3xl font-bold">{t('voiceChecklistMainTitle')}</h1>
        <div className="flex space-x-3">
          <Button variant="ghost" size="icon" aria-label={t('folderAriaLabel')}>
            <IconFolder className="h-6 w-6" />
          </Button>
          <LanguageSwitcher />
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-grow p-4 space-y-4">
        {showListOnMainPage && (
          <Card 
            className="w-full max-w-md shadow-lg cursor-pointer hover:shadow-xl transition-shadow"
            onClick={handleMainPageListCardClick}
          >
            <CardHeader>
              <CardTitle className="text-xl font-semibold">
                {activeListName === null ? t('newUnsavedListTitle') : activeListName || t('savedChecklistTitle')}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              {items.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t('emptyListPreviewMessage')}</p>
              ) : (
                <ul className="space-y-1">
                  {items.slice(0, 4).map(item => (
                    <li 
                      key={item.id} 
                      className="group flex items-center justify-between py-1 hover:bg-muted/50 rounded-md px-2 -mx-2"
                    >
                      <span className={`text-sm ${item.completed ? 'line-through text-muted-foreground' : ''} break-all`}>
                        {item.text}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation(); 
                          handleEditItemFromMainPage(item);
                        }}
                        aria-label={t('editButtonAriaLabel', { taskText: item.text })}
                      >
                        <IconPencil className="h-4 w-4" />
                      </Button>
                    </li>
                  ))}
                  {items.length > 4 && <li className="text-sm text-muted-foreground pt-1">... {t('andMoreItems', {count: items.length - 4})}</li>}
                </ul>
              )}
            </CardContent>
          </Card>
        )}
      </main>

      {/* FAB to open Name Input Modal or create new list placeholder */}
      <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
                <Button
                  variant="default"
                  size="lg"
                  className="fixed bottom-20 right-6 h-16 w-16 rounded-full p-0 shadow-xl hover:shadow-2xl transition-shadow z-50 bg-amber-500 hover:bg-amber-600 text-white"
                  aria-label={t('createNewListButton')}
                  onClick={handleFABClick}
                >
                  <IconPlus className="h-8 w-8" />
                </Button>
            </TooltipTrigger>
            <TooltipContent side="left" sideOffset={10}>
              <p>{t('createNewListButton')}</p>
            </TooltipContent>
          </Tooltip>
      </TooltipProvider>

      {/* Name Input Modal */}
      <Dialog open={isNameInputModalOpen} onOpenChange={setIsNameInputModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogPrimitiveHeader>
            <DialogPrimitiveTitle>{t('nameYourListModalTitle')}</DialogPrimitiveTitle>
            <DialogPrimitiveDescription>
              {activeListName === null ? t('nameYourNewListModalDescription') : t('renameListModalDescription')}
            </DialogPrimitiveDescription>
          </DialogPrimitiveHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="list-name" className="text-right">
                {t('listNameLabel')}
              </Label>
              <Input
                id="list-name"
                value={newListNameInput}
                onChange={(e) => setNewListNameInput(e.target.value)}
                placeholder={t('listNamePlaceholder')}
                className="col-span-3"
                onKeyDown={(e) => e.key === 'Enter' && handleCreateAndOpenNewList()}
              />
            </div>
          </div>
          <DialogPrimitiveFooter>
            <Button type="button" variant="outline" onClick={() => {
                setIsNameInputModalOpen(false);
                if (activeListName === null && items.length === 0) {
                    setShowListOnMainPage(false);
                }
            }}>
              {t('cancelButton')}
            </Button>
            <Button type="submit" onClick={handleCreateAndOpenNewList} disabled={!newListNameInput.trim()}>
              {t('createAndOpenListButton')}
            </Button>
          </DialogPrimitiveFooter>
        </DialogContent>
      </Dialog>

      {/* Main Checklist Editor Modal */}
      <Dialog open={isMainModalOpen} onOpenChange={(open) => {
          setIsMainModalOpen(open);
          if (!open) { 
            setEditingItemId(null);
            if (activeListName) { 
                const storedAllLists = localStorage.getItem(LOCALSTORAGE_ALL_LISTS_KEY);
                if (storedAllLists) {
                    const allListsData = JSON.parse(storedAllLists);
                    if (allListsData[activeListName]) {
                        setItems(allListsData[activeListName]); 
                        setShowListOnMainPage(true); 
                    } else {
                       setShowListOnMainPage(false); 
                    }
                } else {
                     setShowListOnMainPage(false); 
                }
            } else { 
                 if (items.length === 0) setShowListOnMainPage(false); 
            }
          }
        }}>
          <DialogContent className="w-[95vw] max-w-4xl h-[90vh] p-0 flex flex-col overflow-hidden rounded-xl shadow-2xl">
            <div className="flex-shrink-0 p-4 flex justify-center items-center border-b bg-muted/30 relative">
              <h2 className="text-lg font-semibold text-foreground">
                {activeListName ? t('editingListTitle', { listName: activeListName }) : t('voiceChecklistTitle')}
              </h2>
            </div>

            <div className="flex-grow overflow-y-auto">
              <Card className="w-full h-full shadow-none border-none rounded-none flex flex-col">
                 <CardHeader className="bg-primary text-primary-foreground text-center p-6 flex-shrink-0">
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
                <CardFooter className="flex-shrink-0 p-4 border-t flex flex-col sm:flex-row justify-between items-center space-y-2 sm:space-y-0">
                  <Button
                    variant="default"
                    onClick={handleSaveToLocalStorage}
                    aria-label={t('saveChecklistButtonAria', {listName: activeListName || ""})}
                    className="gap-2"
                    disabled={!activeListName} 
                  >
                    <IconSave className="h-5 w-5" />
                    {t('saveChecklistButton')}
                  </Button>
                  <p className="text-center text-xs text-muted-foreground">
                    {t('footerText', { year: new Date().getFullYear() })}
                  </p>
                </CardFooter>
              </Card>
            </div>
          </DialogContent>
        </Dialog>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-background border-t border-border shadow-md flex justify-around items-center p-2 h-16 z-40">
        <Button variant="ghost" className="flex flex-col items-center h-full text-primary">
          <IconList className="h-6 w-6 mb-0.5" />
          <span className="text-xs">{t('notesBottomNav')}</span>
        </Button>
        <Button variant="ghost" className="flex flex-col items-center h-full text-muted-foreground">
          <IconCheckSquare className="h-6 w-6 mb-0.5" />
          <span className="text-xs">{t('tasksBottomNav')}</span>
        </Button>
      </nav>
    </div>
  );
}
    
