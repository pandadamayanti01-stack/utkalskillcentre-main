import { useState, useCallback, useRef } from 'react';

export const useVoiceSearch = (language: 'en' | 'or') => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef<any>(null);

  const startListening = useCallback(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Speech recognition is not supported in this browser.');
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    // Odia support availability differs by browser/OS. Start with Odia and fallback to Hindi/English.
    const preferredLanguages = language === 'or'
      ? ['or-IN', 'hi-IN', 'en-IN']
      : ['en-US', 'en-IN'];
    recognition.lang = preferredLanguages[0];
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 3;

    recognition.onstart = () => {
      setIsListening(true);
      setTranscript('');
    };

    recognition.onresult = (event: any) => {
      const current = event.resultIndex;
      const result = event.results[current][0].transcript;
      setTranscript(result);
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      if ((event.error === 'language-not-supported' || event.error === 'bad-grammar') && preferredLanguages.length > 1) {
        try {
          recognition.lang = preferredLanguages[1];
          recognition.start();
          return;
        } catch (retryErr) {
          console.warn('Speech recognition fallback failed:', retryErr);
        }
      }
      if (event.error === 'not-allowed') {
        alert(language === 'or' 
          ? 'ମାଇକ୍ରୋଫୋନ୍ ଅନୁମତି ମିଳିଲା ନାହିଁ | ଦୟାକରି ଆପଣଙ୍କର ବ୍ରାଉଜର୍ ସେଟିଂସମୂହ ଯାଞ୍ଚ କରନ୍ତୁ |' 
          : 'Microphone permission denied. Please check your browser settings and allow microphone access.');
      } else if (event.error === 'network') {
        alert(language === 'or'
          ? 'ନେଟୱାର୍କ ତ୍ରୁଟି | ଦୟାକରି ଆପଣଙ୍କର ଇଣ୍ଟରନେଟ୍ ସଂଯୋଗ ଯାଞ୍ଚ କରନ୍ତୁ କିମ୍ବା ଏହି ଆପ୍‌କୁ ଏକ ନୂତନ ଟ୍ୟାବ୍‌ରେ ଖୋଲନ୍ତୁ |'
          : 'Network error. Please check your internet connection or try opening this app in a new tab to use voice search.');
      } else if (event.error === 'no-speech') {
        // Silently handle no-speech
      } else {
        alert(language === 'or' 
          ? 'ଭଏସ୍ ସର୍ଚ୍ଚରେ କିଛି ତ୍ରୁଟି ହୋଇଛି | ଦୟାକରି ପୁଣି ଚେଷ୍ଟା କରନ୍ତୁ |' 
          : 'An error occurred with voice search. Please try again.');
      }
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

  return { isListening, transcript, startListening, stopListening };
};
