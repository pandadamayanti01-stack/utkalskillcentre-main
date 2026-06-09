export const AVAILABLE_PREMIUM_MAPS = [
  'Vx3FQK8ZAl67KwvDi1Iy', // Class 10 Life Science - Nutrition (Photosynthesis Map)
  'WHZAR4BSAWixmaPmHuqW', // Class 10 Life Science - Nutrition (Photosynthesis Map - Alternative ID)
  'BYsFgUxdUTQkTXoEyiUZ', // Class 4 Odia - Karuna Sagara Prabhuhe / Tiki Chadhei (Tiki Tiki Map)
  'CUQwtkjyKesVfAtJYiky', // Class 10 Physical Science - Chemical Reactions (Chemical Reactions Map)
  'BkI12z7DPpAaIozm4bKH', // Class 10 Physical Science - Electricity (Electricity Map)
  '5n7Dg8pphGZT8XG2xKHW', // Class 10 Physical Science - Acids, Bases and Salts (Acids Bases Map)
  'hN2uO4iyaCERFcPLmran', // Class 10 Physical Science - Metals and Non-Metals (Metals Non-Metals Map)
  'vfXYwB9Po1rB4Aty4q3Y', // Class 10 Physical Science - Carbon and its Compounds (Carbon Compounds Map)
  'vYSgSwsyfXAUGTHZPMHk', // Class 10 Physical Science - Periodic Classification (Periodic Classification Map)
  'vIk5JIUpltQXmdbvknis', // Class 10 Physical Science - Magnetic Effects (Magnetic Effects Map)
  'yBsU83fVRBM0lGzhfG5N', // Class 10 Physical Science - Human Eye (Human Eye Map)
  '8kGT8tSrIIFZ3sxoeyXt', // Class 10 Life Science - Our Environment (Our Environment Map)
  'PVqIhNgzghFKacVchjs1', // Class 10 Life Science - Control and Coordination (Control and Coordination Map)
  'fNy21816t8C3EMrsdP4S', // Class 10 Life Science - Excretion (Excretion Map)
  'Jb1gxditmbVBJIubDjok', // Class 10 Life Science - Reproduction (Reproduction Map)
  'zti7Pcoic1HhlnFlsGxK', // Class 10 Life Science - Heredity and Evolution (Heredity and Evolution Map)
  'FE7XoiswjRxPglXwvzwd'  // Class 10 Life Science - Covid 19 Management (Covid 19 Management Map)
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
