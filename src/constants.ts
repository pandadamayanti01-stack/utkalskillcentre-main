// Subject keyword mapping for file/subject detection
// Type for subject keys
export type SubjectKey = keyof typeof SUBJECT_FILE_KEYWORDS;

export const SUBJECT_FILE_KEYWORDS: Record<string, string[]> = {
  // Grammar (High Priority to avoid falling into general Language folders)
  odia_grammar: ['odia grammar', 'ଓଡ଼ିଆ ବ୍ୟାକରଣ'],
  english_grammar: ['english grammar'],
  hindi_grammar: ['hindi grammar', 'hindi byakaran', 'byakaran aur prayog'],
  sanskrit_grammar: ['sanskrit grammar'],

  // Language subjects
  odia: ['sahitya sudha', 'sahitya surabhi', 'bhasha mahak', 'bhasa nahak', 'jhulana', 'odia', 'ଝୁଲଣା', 'ଭାଷା ମହକ', 'ସାହିତ୍ୟ ସୁଧା', 'ସାହିତ୍ୟ ସୁମନ', 'ସାହିତ୍ୟ ସୁରଭି'],
  english: ['pallavi', 'jasmine', 'english'],
  hindi: ['hindi kalika', 'hindi manjari', 'hindi saurabh', 'hindi', 'ହିନ୍ଦୀ କଳିକା'],
  sanskrit: ['sanskruta kalika', 'sanaskruta kalika', 'sanskruta sourav', 'sanskruta', 'sanskrit', 'ସଂସ୍କୃତକଳିକା ଭାଗ'],

  // Math - Split to match Class 9/10 folders
  algebra: ['algebra'],
  geometry: ['geometry'],
  math: ['ganita mela', 'ganita prakash', 'maja majare ganita', 'ganita', 'math', 'algebra', 'geometry', 'ଗଣିତ ଖେଳ', 'ମଜା ମଜାରେ ଗଣିତ', 'ଗଣିତ ମେଳା', 'ଗଣିତ ପ୍ରକାଶ'],

  // Science - Split to match Class 9/10 folders
  physical_science: ['physical science'],
  life_science: ['life science'],
  science_curiosity: ['jingyasha', 'jigyansa', 'ଜିଜ୍ଞାସା'],
  science: ['science'],

  // Social Science
  history: ['history'],
  geography: ['geography'],
  social_science: ['social science', 'samajika bigyan', 'ସାମାଜିକ ବିଜ୍ଞାନ ଅଧ୍ୟୟନ ଭାରତ ଓ ଆମ ପୃଥିବୀ', 'history', 'geography', 'hist', 'geo'],

  // EVS (Classes 3-5)
  evs: ['bichitra pruthibi', 'ama bichitra biswa', 'bichitra biswa', 'evs', 'ପରିବେଶ ପାଠ', 'ଆମ ଚର୍ତୁର୍ପାଶ୍ଵର ପୃଥିବୀ'],

  // Arts & Physical
  art: ['indradhanu', 'kalakunja', 'nabarasa', 'kruti', 'art', 'କଳା ଶିକ୍ଷା', 'କଳାକୁଞ୍ଜ', 'କଳାକୃତି', 'କୃତି'],
  physical_education: ['khela o yoga', 'khelajoga', 'krida yoga', 'khel shikhya', 'khela sahitya', 'physical education', 'ଶାରୀରିକ ଶିକ୍ଷା ଏବଂ ସୁସ୍ଥତା', 'କ୍ରୀଡ଼ା ଓ ଯୋଗ', 'ଶାରୀରିକ ଯୋଗ ଓ ସୁସ୍ଥତା', 'ଖେଳ ଶିକ୍ଷା'],

  // Vocational (Explicitly matched to your Class 10 image)
  vocational_agriculture: ['agriculture'],
  vocational_automotive: ['automotive'],
  vocational_tourism: ['tourism'],
  vocational_electronics: ['electronics'],
  vocational: ['koshalbodha', 'kousalabodha', 'vocational', 'କୌଶଳ ବୋଧ'],
};

export const subjectTranslations: Record<string, string> = {
  // Core subjects
  'Mathematics': 'ଗଣିତ',
  'Math': 'ଗଣିତ',
  'Algebra': 'ବୀଜଗଣିତ',
  'Geometry': 'ଜ୍ୟାମିତି',
  'Science': 'ବିଜ୍ଞାନ',
  'Physical_Science': 'ଭୌତିକ ବିଜ୍ଞାନ',
  'Life_Science': 'ଜୀବ ବିଜ୍ଞାନ',
  'English': 'ଇଂରାଜୀ',
  'Odia': 'ଓଡ଼ିଆ',
  'Odia_Grammar': 'ଓଡ଼ିଆ ବ୍ୟାକରଣ',
  'English_Grammar': 'ଇଂରାଜୀ ବ୍ୟାକରଣ',
  'Hindi': 'ହିନ୍ଦୀ',
  'Sanskrit': 'ସଂସ୍କୃତ',
  'History': 'ଇତିହାସ',
  'Geography': 'ଭୂଗୋଳ',
  'Social Studies': 'ସାମାଜିକ ବିଜ୍ଞାନ',
  'EVS': 'ପରିବେଶ ବିଜ୍ଞାନ',

  // Vocational (Specific Trades)
  'Vocational_Agriculture': 'କୃଷି ବିଜ୍ଞାନ',
  'Vocational_Automotive': 'ଅଟୋମୋଟିଭ୍',
  'Vocational_Tourism': 'ପର୍ଯ୍ୟଟନ',
  'Vocational_Electronics': 'ଇଲେକ୍ଟ୍ରୋନିକ୍ସ',
  'Vocational Education': 'ଧନ୍ଦାମୂଳକ ଶିକ୍ଷା',

  // Others
  'Art Education': 'କଳା ଶିକ୍ଷା',
  'Physical Education': 'ଶାରୀରିକ ଶିକ୍ଷା',
  'Science (Jigyansa)': 'ବିଜ୍ଞାନ (ଜିଜ୍ଞାସା)'
};
