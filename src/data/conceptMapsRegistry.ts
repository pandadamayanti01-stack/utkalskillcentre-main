export const AVAILABLE_PREMIUM_MAPS = [
  'Vx3FQK8ZAl67KwvDi1Iy',
  'Bases and Salts (Acids Bases Map)  hN2uO4iyaCERFcPLmran',
  'RCcFvgtfQscdEfx2ppWB',
  'yEpFBOFHNX07NnGyz7k3',
  'YILwHvMcyPII0LXrnAmJ',
  'gknuEN2rccGYW4RiMvRw',
  'SIqN8U9fvVQfhCzwkWNi'
];

/**
 * Returns the path to the concept map image if it exists in our premium assets,
 * or null otherwise.
 */
export const getPremiumConceptMapUrl = (chapterId: string, language: 'en' | 'or'): string | null => {
  if (AVAILABLE_PREMIUM_MAPS.includes(chapterId)) {
    if (language === 'or' && chapterId !== 'BYsFgUxdUTQkTXoEyiUZ') {
      return `/concept_maps/${chapterId}_or.png`;
    }
    return `/concept_maps/${chapterId}.png`;
  }
  return null;
};
