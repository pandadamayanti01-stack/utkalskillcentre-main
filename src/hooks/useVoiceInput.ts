import { useState, useCallback, useRef } from 'react';

/**
 * Hook for capturing voice input specifically for answering questions.
 * Optimized for Odia and English.
 */
export const useVoiceInput = (language: 'en' | 'or' = 'or') => {
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const finalTranscriptRef = useRef<string>('');

  const startListening = useCallback((onResult: (text: string) => void) => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setError('Speech recognition not supported');
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    const preferredLanguages = language === 'or'
      ? ['or-IN', 'hi-IN', 'en-IN']
      : ['en-IN', 'en-US'];

    recognition.lang = preferredLanguages[0];
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 3;

    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
      finalTranscriptRef.current = '';
    };

    recognition.onresult = (event: any) => {
      let interimTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          const text = event.results[i][0].transcript;
          finalTranscriptRef.current += text + ' ';
          onResult(text);
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      if (event.error === 'no-speech') {
        // Just stop
        setIsListening(false);
        return;
      }
      
      if ((event.error === 'language-not-supported' || event.error === 'bad-grammar') && preferredLanguages.length > 1) {
        try {
          recognition.lang = preferredLanguages[1];
          recognition.start();
          return;
        } catch (e) {
          console.warn('Fallback failed', e);
        }
      }
      setError(event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
    recognitionRef.current = recognition;
  }, [language]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  }, []);

  return { isListening, error, startListening, stopListening };
};
