import { safeJsonStringify } from '../firebase';

export const OfflineService = {
  saveNote: (chapterId: string, content: string) => {
    const notes = JSON.parse(localStorage.getItem('offline_notes') || '{}');
    notes[chapterId] = content;
    localStorage.setItem('offline_notes', safeJsonStringify(notes));
  },

  getNote: (chapterId: string) => {
    const notes = JSON.parse(localStorage.getItem('offline_notes') || '{}');
    return notes[chapterId] || null;
  },

  getAllNotes: () => {
    return JSON.parse(localStorage.getItem('offline_notes') || '{}');
  },

  deleteNote: (chapterId: string) => {
    const notes = JSON.parse(localStorage.getItem('offline_notes') || '{}');
    delete notes[chapterId];
    localStorage.setItem('offline_notes', safeJsonStringify(notes));
  },

  saveTextbook: (textbookId: string, data: any) => {
    const textbooks = JSON.parse(localStorage.getItem('offline_textbooks') || '{}');
    textbooks[textbookId] = data;
    localStorage.setItem('offline_textbooks', safeJsonStringify(textbooks));
  },

  getOfflineTextbooks: () => {
    return JSON.parse(localStorage.getItem('offline_textbooks') || '{}');
  },

  deleteTextbook: (textbookId: string) => {
    const textbooks = JSON.parse(localStorage.getItem('offline_textbooks') || '{}');
    delete textbooks[textbookId];
    localStorage.setItem('offline_textbooks', safeJsonStringify(textbooks));
  }
};
