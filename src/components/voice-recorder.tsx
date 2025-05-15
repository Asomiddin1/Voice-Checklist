"use client";

import type React from 'react';
import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, Square, Loader2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VoiceRecorderProps {
  onRecordingComplete: (audioBlob: Blob) => void;
  onRecordingError: (error: string) => void;
  isProcessing: boolean;
}

const VoiceRecorder: React.FC<VoiceRecorderProps> = ({ onRecordingComplete, onRecordingError, isProcessing }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [showPermissionMessage, setShowPermissionMessage] = useState(false);

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
      // Close the stream immediately after permission is granted, if not starting recording
      stream.getTracks().forEach(track => track.stop());
      setHasPermission(true);
      setShowPermissionMessage(false);
      return true;
    } catch (err) {
      console.error('Error requesting microphone permission:', err);
      onRecordingError('Microphone permission denied. Please enable it in your browser settings.');
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
        stream.getTracks().forEach(track => track.stop()); // Release microphone
      };
      
      mediaRecorderRef.current.onerror = (event) => {
        console.error('MediaRecorder error:', event);
        onRecordingError('An error occurred during recording.');
        setIsRecording(false);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (err) {
      console.error('Error starting recording:', err);
      onRecordingError('Could not start recording. Please ensure microphone is available.');
      setHasPermission(false); // Re-set permission state as it might have failed
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
        aria-label={isRecording ? "Stop recording" : (isProcessing ? "Processing audio" : "Start recording")}
      >
        {isProcessing ? (
          <Loader2 className="mr-2 h-6 w-6 animate-spin" />
        ) : isRecording ? (
          <Square className="mr-2 h-6 w-6" />
        ) : (
          <Mic className="mr-2 h-6 w-6" />
        )}
        {isProcessing ? 'Processing...' : isRecording ? 'Stop Recording' : 'Record Voice'}
      </Button>
      {isRecording && (
        <div className="flex items-center text-sm text-muted-foreground animate-pulse">
          <div className="w-2 h-2 bg-red-500 rounded-full mr-2"></div>
          Recording...
        </div>
      )}
      {showPermissionMessage && !hasPermission && (
         <div className="mt-2 text-sm text-destructive flex items-center">
           <AlertCircle className="w-4 h-4 mr-1" />
           Microphone permission denied. Please enable it in browser settings.
         </div>
      )}
    </div>
  );
};

export default VoiceRecorder;
