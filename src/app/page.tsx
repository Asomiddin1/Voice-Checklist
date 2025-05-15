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
import { checklistAutoGenerator, ChecklistAutoGeneratorInput } from '@/ai/flows/checklist-auto-generator';
import { AlertTriangle } from 'lucide-react';

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

  useEffect(() => {
    setIsMounted(true);
    // Load items from local storage if available
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
      // Save items to local storage
      try {
        localStorage.setItem('checklistItems', JSON.stringify(items));
      } catch (error) {
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
          title: "Empty Transcription",
          description: "Could not detect any speech. Please try again.",
          variant: "default",
        });
        setIsLoading(false);
        return;
      }
      
      toast({
        title: "Transcription Successful",
        description: `"${transcriptionOutput.text.substring(0,50)}..."`,
      });

      const generatorInput: ChecklistAutoGeneratorInput = { speechTranscription: transcriptionOutput.text };
      const generatorOutput = await checklistAutoGenerator(generatorInput);

      if (generatorOutput.checklistItems && generatorOutput.checklistItems.length > 0) {
        addMultipleItems(generatorOutput.checklistItems);
        toast({
          title: "Items Added!",
          description: `${generatorOutput.checklistItems.length} new item(s) added to your checklist.`,
          variant: "default", // 'default' is like 'success' in this theme
        });
      } else {
        toast({
          title: "No Checklist Items Found",
          description: "AI couldn't identify specific tasks in your speech.",
        });
      }
    } catch (error: any) {
      console.error('Error processing voice input:', error);
      toast({
        title: "Error Processing Voice",
        description: error.message || "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRecordingError = (errorMsg: string) => {
    toast({
      title: "Recording Error",
      description: errorMsg,
      variant: "destructive",
    });
     setIsLoading(false); // Ensure loading state is reset on recording error
  };

  const addMultipleItems = (texts: string[]) => {
    const newItems: ChecklistItemType[] = texts.map(text => ({
      id: crypto.randomUUID(),
      text,
      completed: false,
    }));
    setItems(prevItems => [...prevItems, ...newItems]);
  };
  
  const handleAddItemManually = (text: string) => {
    addMultipleItems([text]);
     toast({
      title: "Item Added",
      description: `"${text.substring(0,30)}..." added to your checklist.`,
    });
  };

  const handleToggleItem = (id: string) => {
    setItems(prevItems =>
      prevItems.map(item =>
        item.id === id ? { ...item, completed: !item.completed } : item
      )
    );
  };

  const handleDeleteItem = (id: string) => {
    setItems(prevItems => prevItems.filter(item => item.id !== id));
    toast({
      title: "Item Deleted",
      description: "The item has been removed from your checklist.",
    });
  };
  
  if (!isMounted) {
     return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4 md:p-8 bg-gradient-to-br from-background to-secondary">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
        <p className="mt-4 text-lg text-foreground">Loading Your Checklist...</p>
      </div>
    );
  }


  return (
    <div className="flex min-h-screen flex-col items-center justify-start p-4 md:p-8 bg-gradient-to-br from-background to-secondary">
      <Card className="w-full max-w-2xl shadow-2xl rounded-xl overflow-hidden">
        <CardHeader className="bg-primary text-primary-foreground text-center p-6">
          <CardTitle className="text-3xl font-bold tracking-tight">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="inline-block mr-2 mb-1"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" x2="12" y1="19" y2="22"></line></svg>
            Voice Checklist
          </CardTitle>
          <CardDescription className="text-primary-foreground/80 text-sm">
            Speak your tasks, or type them in. Get organized effortlessly!
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
            <span className="text-xs text-muted-foreground font-medium">OR</span>
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
        <p>&copy; {new Date().getFullYear()} Voice Checklist App. Built with Next.js and AI.</p>
      </footer>
    </div>
  );
}

// Custom Loader2 component for initial loading screen
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

