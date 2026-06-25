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
  'FE7XoiswjRxPglXwvzwd', // Class 10 Life Science - Covid 19 Management (Covid 19 Management Map)
  'lw9n7sG7qxnfbwm4kLY9', // Class 10 Algebra - Linear Simultaneous Equations (Linear Simultaneous Equations Map)
  'bH692tqUJlkINiHpNJMk', // Class 10 Algebra - Quadratic Equations (Quadratic Equations Map)
  'ZNhThX6hmIa5GKYUDpIX', // Class 10 Algebra - Arithmetic Progression (Arithmetic Progression Map)
  'lQX4qU8uY9Rjy5wrcUhX', // Class 10 Algebra - Probability (Probability Map)
  'zM3ZUo9MXaprYQbtlbC4', // Class 10 Algebra - Statistics (Statistics Map)
  'cKl1PFkdrkgSnGH7AReP', // Class 10 Algebra - Co-ordinate Geometry (Co-ordinate Geometry Map)
  'zjmscF6RCwSzh7UsljMp', // Class 10 Geometry - Similarity (Similarity Map)
  'HlfuVAm9dcK1gGpNkpuq', // Class 10 Geometry - Similarity (Similarity Map - Alternative ID)
  'bq9cINIoZgSaIWag7JLM', // Class 10 Geometry - Circles (Circles Map)
  'j5ym70mivqsTXHpAnMxJ', // Class 10 Geometry - Tangents to a Circle (Tangents Map)
  'cHD1xEpJvTclMfvi5ZJH', // Class 10 Geometry - Trigonometry (Trigonometry Map)
  '4XpiLqgcg15qMNkQdgMm', // Class 10 Geometry - Mensuration (Mensuration Map)
  '7Yukb86gfwmb9Bptpbwd'  // Class 10 Geometry - Construction (Construction Map)
];

/**
 * Returns the path to the concept map image if it exists in our premium assets,
 * or null otherwise.
 */
export const getPremiumConceptMapUrl = (chapterId: string, language: 'en' | 'or'): string | null => {
  // Disabled custom generated image maps in favor of clean interactive SVG maps
  return null;
};
