import { translations } from '../translations';
import { subjectTranslations } from '../constants';

export const getLocalizedSubject = (subject: string, language: string) => {
  if (!subject) return '';
  
  // First check if it's a key in translations
  const localized = (translations as any)[language]?.subjects?.[subject];
  if (localized) return localized;

  // Then check legacy subjectTranslations
  if (language === 'or' && (subjectTranslations as any)[subject]) {
    return (subjectTranslations as any)[subject];
  }

  // If it's already a localized label (e.g., from old data), return it
  return subject;
};

export const fetchJson = async (url: string, options?: RequestInit) => {
  const res = await fetch(url, options);
  const contentType = res.headers.get("content-type");
  if (!res.ok) {
    let errorMsg = `Error ${res.status}: ${res.statusText}`;
    if (contentType && contentType.includes("application/json")) {
      const errorData = await res.json();
      errorMsg = errorData.error || errorMsg;
    }
    throw new Error(errorMsg);
  }
  if (!contentType || !contentType.includes("application/json")) {
    throw new Error(`Expected JSON response but got ${contentType || 'unknown'}`);
  }
  return res.json();
};

export const getDirectDriveDownloadUrl = (url: string): string => {
  if (!url || typeof url !== 'string') return url || '';
  
  let fileId = '';
  const fileDMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (fileDMatch && fileDMatch[1]) {
    fileId = fileDMatch[1];
  } else {
    const idMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (idMatch && idMatch[1]) {
      fileId = idMatch[1];
    }
  }
  
  if (fileId) {
    return `https://drive.google.com/uc?export=download&id=${fileId}&authuser=0`;
  }
  
  return url;
};
