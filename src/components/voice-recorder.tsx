
"use client";

import type React from 'react';
import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, Square, Loader2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';

interface VoiceRecorderProps {
  onRecordingComplete: (audioBlob: Blob) => void;
  onRecordingError: (errorKey: string, params?: Record<string, string|number>) => void;
  isProcessing: boolean;
}

const VoiceRecorder: React.FC<VoiceRecorderProps> = ({ onRecordingComplete, onRecordingError, isProcessing }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [showPermissionMessage, setShowPermissionMessage] = useState(false);
  const { t } = useLanguage();

  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const requestPermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      setHasPermission(true);
      setShowPermissionMessage(false);
      return true;
    } catch (err) {
      console.error('Error requesting microphone permission:', err);
      onRecordingError('microphonePermissionDeniedError');
      setHasPermission(false);
      setShowPermissionMessage(true);
      return false;
    }
  };

  const startRecording = async () => {
    let permissionGranted = hasPermission;
    if (hasPermission === null || !hasPermission) {
        permissionGranted = await requestPermission();
    }

    if (!permissionGranted) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        onRecordingComplete(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorderRef.current.onerror = (event) => {
        console.error('MediaRecorder error:', event);
        onRecordingError('unexpectedError'); // Generic error key
        setIsRecording(false);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (err) {
      console.error('Error starting recording:', err);
      onRecordingError('unexpectedError'); // Generic error key
      setHasPermission(false);
      setShowPermissionMessage(true);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  const handleButtonClick = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const buttonText = isProcessing ? t('processingAudioButton') : isRecording ? t('stopRecordingButton') : t('recordVoiceButton');
  const ariaLabel = isRecording ? t('stopRecordingButton') : (isProcessing ? t('processingAudioButton') : t('recordVoiceButton'));

  return (
    <div className="flex flex-col items-center space-y-3">
      <Button
        onClick={handleButtonClick}
        disabled={isProcessing}
        className={cn(
          "w-full sm:w-auto text-lg px-8 py-6 rounded-lg shadow-md transition-all duration-300 ease-in-out",
          isRecording ? "bg-red-500 hover:bg-red-600" : "bg-primary hover:bg-primary/90",
          isProcessing && "opacity-75 cursor-not-allowed"
        )}
        aria-live="polite"
        aria-label={ariaLabel}
      >
        {isProcessing ? (
          <Loader2 className="mr-2 h-6 w-6 animate-spin" />
        ) : isRecording ? (
          <Square className="mr-2 h-6 w-6" />
        ) : (
          <Mic className="mr-2 h-6 w-6" />
        )}
        {buttonText}
      </Button>
      {isRecording && (
        <div className="flex items-center text-sm text-muted-foreground animate-pulse">
          <div className="w-2 h-2 bg-red-500 rounded-full mr-2"></div>
          {/* Recording... text can be added to locales if needed */}
          Recording... 
        </div>
      )}
      {showPermissionMessage && !hasPermission && (
         <div className="mt-2 text-sm text-destructive flex items-center">
           <AlertCircle className="w-4 h-4 mr-1" />
           {t('microphonePermissionDeniedError')}
         </div>
      )}
    </div>
  );
};

export default VoiceRecorder;
