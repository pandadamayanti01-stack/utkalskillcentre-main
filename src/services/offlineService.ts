export const OfflineService = {
  saveNote: (chapterId: string, content: string) => {
    const notes = JSON.parse(localStorage.getItem('offline_notes') || '{}');
    notes[chapterId] = content;
    localStorage.setItem('offline_notes', JSON.stringify(notes));
  },

  getNote: (chapterId: string) => {
    const notes = JSON.parse(localStorage.getItem('offline_notes') || '{}');
    return notes[chapterId] || null;
  },

  getAllNotes: () => {
    return JSON.parse(localStorage.getItem('offline_notes') || '{}');
  },

  saveTextbook: (textbookId: string, data: any) => {
    const textbooks = JSON.parse(localStorage.getItem('offline_textbooks') || '{}');
    textbooks[textbookId] = data;
    localStorage.setItem('offline_textbooks', JSON.stringify(textbooks));
  },

  getOfflineTextbooks: () => {
    return JSON.parse(localStorage.getItem('offline_textbooks') || '{}');
  }
};
