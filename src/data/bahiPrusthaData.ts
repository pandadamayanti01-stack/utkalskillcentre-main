// Bahi Prustha Khela (ବହି ପୃଷ୍ଠା ଖେଳ) Offline Data Repository
// Contains Math levels, Odia sentences, and Kindle-style playbooks

export interface MathLevelConfig {
  classRange: string;
  instruction: string;
  minPage: number;
  maxPage: number;
  questionType: 'single' | 'double' | 'triple' | 'modulo' | 'divisibility';
}

export const MATH_LEVELS: Record<number, MathLevelConfig> = {
  1: { classRange: 'Class 1', instruction: 'ପୃଷ୍ଠା ସଂଖ୍ୟା ଦେଖି ଚିତ୍ର ଗଣନ୍ତୁ ।', minPage: 1, maxPage: 9, questionType: 'single' },
  2: { classRange: 'Class 2', instruction: 'ପୃଷ୍ଠା ସଂଖ୍ୟାର ଅଙ୍କଗୁଡ଼ିକୁ ଯୋଗ କରନ୍ତୁ ।', minPage: 10, maxPage: 50, questionType: 'double' },
  3: { classRange: 'Class 3', instruction: 'ପୃଷ୍ଠା ସଂଖ୍ୟାର ଅଙ୍କଗୁଡ଼ିକୁ ଯୋଗ କରନ୍ତୁ ।', minPage: 10, maxPage: 99, questionType: 'double' },
  4: { classRange: 'Class 4', instruction: 'ପୃଷ୍ଠା ସଂଖ୍ୟାର ଅଙ୍କଗୁଡ଼ିକୁ ଯୋଗ କରନ୍ତୁ ।', minPage: 50, maxPage: 150, questionType: 'double' },
  5: { classRange: 'Class 5', instruction: 'ପୃଷ୍ଠା ସଂଖ୍ୟାର ଅଙ୍କଗୁଡ଼ିକୁ ଯୋଗ କରନ୍ତୁ ।', minPage: 100, maxPage: 250, questionType: 'double' },
  6: { classRange: 'Class 6', instruction: '୩-ଅଙ୍କ ବିଶିଷ୍ଟ ପୃଷ୍ଠା ସଂଖ୍ୟାର ସମସ୍ତ ଅଙ୍କ ଯୋଗ କରନ୍ତୁ ।', minPage: 100, maxPage: 350, questionType: 'triple' },
  7: { classRange: 'Class 7', instruction: '୩-ଅଙ୍କ ବିଶିଷ୍ଟ ପୃଷ୍ଠା ସଂଖ୍ୟାର ସମସ୍ତ ଅଙ୍କ ଯୋଗ କରନ୍ତୁ ।', minPage: 100, maxPage: 400, questionType: 'triple' },
  8: { classRange: 'Class 8', instruction: '୩-ଅଙ୍କ ବିଶିଷ୍ଟ ପୃଷ୍ଠା ସଂଖ୍ୟାର ସମସ୍ତ ଅଙ୍କ ଯୋଗ କରନ୍ତୁ ।', minPage: 100, maxPage: 450, questionType: 'triple' },
  9: { classRange: 'Class 9', instruction: 'ଯୋଗଫଳ ଯୁଗ୍ମ ନา ଅଯୁଗ୍ମ ଚିହ୍ନଟ କରନ୍ତୁ ।', minPage: 100, maxPage: 500, questionType: 'modulo' },
  10: { classRange: 'Class 10', instruction: 'ପୃଷ୍ଠା ସଂଖ୍ୟାଟି ୩ ଦ୍ୱାରା ବିଭାଜ୍ୟ କି ନୁହେଁ କୁହନ୍ତୁ ।', minPage: 100, maxPage: 600, questionType: 'divisibility' },
};

export interface OdiaSentenceQuestion {
  id: string;
  sentence: string; // The sentence with blank like "____"
  missingWord: string;
  options: string[];
  pageNumber: number;
  hint: string;
}

export const ODIA_TEXTBOOK_SENTENCES: Record<number, OdiaSentenceQuestion[]> = {
  1: [
    { id: 'o-1-1', sentence: 'ଆମ ଦେଶର ନାମ ହେଉଛି ____ ।', missingWord: 'ଭାରତ', options: ['ଭାରତ', 'ଓଡ଼ିଶା', 'କଟକ', 'ପୁରୀ'], pageNumber: 8, hint: 'ଅକ୍ଷର ସଂଖ୍ୟା ୩ ଏବଂ ପ୍ରଥମ ଅକ୍ଷର ଭା ।' },
    { id: 'o-1-2', sentence: 'ଆମ ରାଜ୍ୟର ନାମ ____ ଅଟେ ।', missingWord: 'ଓଡ଼ିଶା', options: ['ଭାରତ', 'ଓଡ଼ିଶା', 'ଦିଲ୍ଲୀ', 'କଲିକତା'], pageNumber: 12, hint: 'ଏହାର ଶେଷ ଅକ୍ଷର ଶା ।' }
  ],
  2: [
    { id: 'o-2-1', sentence: 'ଜାତୀୟ ପତାକାର ମଝିରେ ____ ଚକ୍ର ଥାଏ ।', missingWord: 'ଅଶୋକ', options: ['ଅଶୋକ', 'ଧର୍ମ', 'ସୂର୍ଯ୍ୟ', 'ଚନ୍ଦ୍ର'], pageNumber: 15, hint: 'ମହାନ୍ ସମ୍ରାଟଙ୍କ ନାମ ଅନୁସାରେ ।' },
    { id: 'o-2-2', sentence: 'ଆମ ଜାତୀୟ ପଶୁ ____ ଅଟେ ।', missingWord: 'ବାଘ', options: ['ସିଂହ', 'ବାଘ', 'ହାତୀ', 'ଭାଲୁ'], pageNumber: 23, hint: 'ଡୋରିଆ ଦାଗ ଥିବା ଏକ ହିଂସ୍ର ପଶୁ ।' }
  ],
  3: [
    { id: 'o-3-1', sentence: 'ଉତ୍କଳମଣି ଗୋପବନ୍ଧୁ ଦାସ ____ ଠାରେ ବନ ବିଦ୍ୟାଳୟ ପ୍ରତିଷ୍ଠା କରିଥିଲେ ।', missingWord: 'ସାକ୍ଷୀଗୋପାଳ', options: ['କଟକ', 'ଭୁବନେଶ୍ୱର', 'ସାକ୍ଷୀଗୋପାଳ', 'ପୁରୀ'], pageNumber: 34, hint: 'ପୁରୀ ଜିଲ୍ଲାର ଏକ ଐତିହାସିକ ସ୍ଥାନ ।' },
    { id: 'o-3-2', sentence: 'ମଧୁସୂଦନ ଦାସଙ୍କୁ ଓଡ଼ିଶାରେ ____ କୁହାଯାଏ ।', missingWord: 'ମଧୁବାବୁ', options: ['ଗୋପବାବୁ', 'ମଧୁବାବୁ', 'ନେତାଜୀ', 'ବ୍ୟାସକବି'], pageNumber: 42, hint: 'ତାଙ୍କୁ ଗର୍ବରେ ଉତ୍କଳ ଗୌରବ ମଧ୍ୟ କୁହାଯାଏ ।' }
  ],
  4: [
    { id: 'o-4-1', sentence: 'ଓଡ଼ିଶାର ସର୍ବବୃହତ ହ୍ରଦ ହେଉଛି ____ ।', missingWord: 'ଚିଲିକା', options: ['ଅଂଶୁପା', 'ଚିଲିକା', 'ହିରାକୁଦ', 'ପାଟ'], pageNumber: 55, hint: 'ପକ୍ଷୀମାନଙ୍କର ନୀଳାମ୍ବୁ କ୍ରୀଡ଼ାଭୂମି ।' },
    { id: 'o-4-2', sentence: 'ଶ୍ରୀମନ୍ଦିର ଓଡ଼ିଶାର ____ ସହରରେ ଅବସ୍ଥିତ ।', missingWord: 'ପୁରୀ', options: ['ପୁରୀ', 'ଭୁବନେଶ୍ୱର', 'କଟକ', 'ଖୋର୍ଦ୍ଧା'], pageNumber: 62, hint: 'ଶ୍ରୀଜଗନ୍ନାଥଙ୍କ ଲୀଳାକ୍ଷେତ୍ର ।' }
  ],
  5: [
    { id: 'o-5-1', sentence: 'ଉତ୍କଳ ଗୌରବ ମଧୁସୂଦନ ଦାସଙ୍କ ଜନ୍ମସ୍ଥାନ ____ ଅଟେ ।', missingWord: 'ସତ୍ୟଭାମାପୁର', options: ['ସତ୍ୟଭାମାପୁର', 'ସାକ୍ଷୀଗୋପାଳ', 'କଟକ', 'କୋଣାର୍କ'], pageNumber: 74, hint: 'କଟକ ଜିଲ୍ଲାର ଏକ ପ୍ରସିଦ୍ଧ ଶାସନ ଗ୍ରାମ ।' },
    { id: 'o-5-2', sentence: 'ଓଡ଼ିଶାର ମୁଖ୍ୟ ପ୍ରାକୃତିକ ବନ୍ଦର ହେଉଛି ____ ।', missingWord: 'ପାରାଦୀପ', options: ['ପାରାଦୀପ', 'ଗୋପାଳପୁର', 'ଧାମରା', 'ଚାନ୍ଦବାଲି'], pageNumber: 86, hint: 'ଜଗତସିଂହପୁର ଜିଲ୍ଲାର ବୃହତ ସମୁଦ୍ର ବନ୍ଦର ।' }
  ],
  6: [
    { id: 'o-6-1', sentence: 'କୋଣାର୍କ ସୂର୍ଯ୍ୟ ମନ୍ଦିର ____ ନଦୀ କୂଳରେ ନିର୍ମିତ ହୋଇଥିଲା ।', missingWord: 'ଚନ୍ଦ୍ରଭାଗା', options: ['ମହାନଦୀ', 'କାଠଯୋଡ଼ି', 'ଚନ୍ଦ୍ରଭାଗା', 'ବୈତରଣୀ'], pageNumber: 104, hint: 'ଏହା ଏକ ପବିତ୍ର ତୀର୍ଥ ନଦୀ ବର୍ତ୍ତମାନ ଶୁଖିଯାଇଛି ।' },
    { id: 'o-6-2', sentence: 'ଧର୍ମପଦ କୋଣାର୍କ ମନ୍ଦିରର ____ ବାନ୍ଧି ସମୁଦ୍ରକୁ ଡେଇଁଥିଲା ।', missingWord: 'ଦଧିନଉତି', options: ['ମୁଣ୍ଡି', 'ଦଧିନଉତି', 'ଚକ୍ର', 'ବାଲି'], pageNumber: 115, hint: 'ମନ୍ଦିରର ଶେଷ ମୁକୁଟ ସଦୃଶ ଅଂଶ ।' }
  ],
  7: [
    { id: 'o-7-1', sentence: 'ବ୍ୟାସକବି ଫକୀର ମୋହନ ସେନାପତିଙ୍କ ରଚିତ ଓଡ଼ିଆ ଉପନ୍ୟାସ ____ ଅଟେ ।', missingWord: 'ଛମାଣ ଆଠଗୁଣ୍ଠ', options: ['ମաଟିର ମଣିଷ', 'ଛମାଣ ଆଠଗୁଣ୍ଠ', 'ଲଛମା', 'ପ୍ରାୟଶ୍ଚିତ'], pageNumber: 128, hint: 'ରାମଚନ୍ଦ୍ର ମଙ୍ଗରାଜ ଚରିତ୍ରକୁ ନେଇ ରଚିତ ।' },
    { id: 'o-7-2', sentence: 'କବିବର ରାଧାନାଥ ରାୟଙ୍କ ପ୍ରସିଦ୍ଧ କାବ୍ୟ ହେଉଛି ____ ।', missingWord: 'ଚିଲିକା', options: ['ଦରବାର', 'ଚିଲିକା', 'କେଦାରଗୌରୀ', 'ଚନ୍ଦ୍ରଭାଗା'], pageNumber: 135, hint: 'ହ୍ରଦର ପ୍ରାକୃତିକ ସୌନ୍ଦର୍ଯ୍ୟ ବର୍ଣ୍ଣନା କରାଯାଇଛି ।' }
  ],
  8: [
    { id: 'o-8-1', sentence: 'ସାରଳา ଦାସ ଓଡ଼ିଶାର ____ ଶତାବ୍ଦୀର କବି ଥିଲେ ।', missingWord: 'ପଞ୍ଚଦଶ', options: ['ଚତୁର୍ଦ୍ଦଶ', 'ପଞ୍ଚଦଶ', 'ଷୋଡ଼ଶ', 'ସପ୍ତଦଶ'], pageNumber: 160, hint: 'ସୂର୍ଯ୍ୟବଂଶୀ ରାଜା କପିଳେନ୍ଦ୍ରଦେବଙ୍କ ସମୟ ।' },
    { id: 'o-8-2', sentence: 'ଭକ୍ତକବି ମଧୁସୂଦନ ରାଓଙ୍କ ଲିଖିତ ଓଡ଼ିଆ ବର୍ଣ୍ଣମାଳା ବହି ହେଉଛି ____ ।', missingWord: 'ବର୍ଣ୍ଣବୋଧ', options: ['ଛବିଳ ମଧୁ ବର୍ଣ୍ଣବୋଧ', 'ବର୍ଣ୍ଣବୋଧ', 'ଶିଶୁ ପାଠ୍ୟ', 'ସାହିତ୍ୟ କଳିକା'], pageNumber: 172, hint: 'ଓଡ଼ିଆ ବର୍ଣ୍ଣ ଶିକ୍ଷାର ମୂଳ ଭିତ୍ତି ।' }
  ],
  9: [
    { id: 'o-9-1', sentence: 'ଭାରତୀୟ ସମ୍ବିଧାନର ଜନକ ଭାବେ ____ ପରିଚିତ ।', missingWord: 'ଆମ୍ବեଦକର', options: ['ଗାନ୍ଧିଜୀ', 'ଆମ୍ବେଦକର', 'ନେହେରୁ', 'ପଟେଲ'], pageNumber: 210, hint: 'ଡକ୍ଟର ଭୀମରାଓ ରାମଜୀ ଆମ୍ବେଦକର ।' },
    { id: 'o-9-2', sentence: 'ପଞ୍ଚସଖା ଯୁଗର ଅନ୍ୟତମ କବି ହେଉଛନ୍ତି ____ ।', missingWord: 'ଜଗନ୍ନାଥ ଦାସ', options: ['ଜଗନ୍ନାଥ ଦାସ', 'ଉପେନ୍ଦ୍ର ଭଞ୍ଜ', 'କବିସୂର୍ଯ୍ୟ', 'ସାରଳา ଦାସ'], pageNumber: 224, hint: 'ଓଡ଼ିଆ ଭାଗବତର ରଚୟିତା ।' }
  ],
  10: [
    { id: 'o-10-1', sentence: 'ସାହିତ୍ୟରେ ନୋବେଲ୍ ପୁରସ୍କାର ପାଇଥିବା ପ୍ରଥମ ଏସୀୟ କବି ____ ଅଟନ୍ତି ।', missingWord: 'ରବୀନ୍ଦ୍ରନାଥ ଟାଗୋର', options: ['ରବୀନ୍ଦ୍ରନାଥ ଟାଗୋର', 'ସରୋଜିନୀ ନାଇଡୁ', 'ସି. ଭି. ରମଣ', 'ହରଗୋବିନ୍ଦ ଖୋରାନା'], pageNumber: 285, hint: 'ଗୀତାଞ୍ଜଳି କାବ୍ୟ ପାଇଁ ପୁରସ୍କୃତ ।' },
    { id: 'o-10-2', sentence: 'ଓଡ଼ିଆ ସାହିତ୍ୟର ସର୍ବପ୍ରଥମ ସାମାଜିକ ନାଟକ ହେଉଛି ____ ।', missingWord: 'ବାବାଜୀ', options: ['ବାବାଜୀ', 'କାଞ୍ଚି କାବେରୀ', 'ଜଗନ୍ମୋହନ', 'ସତୀ'], pageNumber: 298, hint: 'ନାଟ୍ୟକାର ଜଗନ୍ମୋହନ ଲାଲ୍‌ଙ୍କ ଦ୍ୱାରା ରଚିତ ।' }
  ]
};

export interface PlaybookPage {
  pageNo: number;
  text: string; // Odia story text
  embeddedQuestion: {
    type: 'math' | 'word';
    prompt: string; // Odia prompt
    options: string[];
    correctAnswer: string;
  };
}

export interface Playbook {
  id: string;
  title: string;
  coverColor: string;
  description: string;
  xpCost: number;
  pages: PlaybookPage[];
}

export const PLAYBOOKS: Playbook[] = [
  {
    id: 'fox-crow',
    title: 'ଚତୁର ବିଲୁଆ ଓ ଶୋଷିଲା କାଉ',
    coverColor: 'from-orange-500 to-amber-600',
    description: 'ଏକ ଜଙ୍गଲର ମଜାଦାର କାହାଣୀ ।',
    xpCost: 0,
    pages: [
      {
        pageNo: 1,
        text: 'ଗୋଟିଏ ଜଙ୍ଗଲରେ ଏକ କାଉ ବହୁତ ଶୋଷିଲା ହୋଇ ଉଡୁଥିଲା । ପାଣି ପାଇଁ ସେ ଏପଟ ସେପଟ ଖୋଜୁଥିଲା । ହଠାତ୍ ସେ ଏକ ବଗିଚାରେ ପାଣି ମାଠିଆ ଦେଖିଲା । ମାଠିଆ ନିକଟରେ ୫ ଟି କଳା ଗୋଡ଼ି ଏବଂ ୬ ଟି ଧଳା ଗୋଡ଼ି ପଡ଼ିଥିଲା ।',
        embeddedQuestion: {
          type: 'math',
          prompt: 'ମୋଟ କେତୋଟି ଗୋଡ଼ି ପଡ଼ିଥିଲା?',
          options: ['୧୦', '୧୧', '୧୨', '୧୩'],
          correctAnswer: '୧୧'
        }
      },
      {
        pageNo: 2,
        text: 'କାଉ ମାଠିଆ ଭିତରକୁ ଚାହିଁଲା କିନ୍ତୁ ପାଣି ବହୁତ ତଳେ ଥିଲା । ସେ ଉପାୟଟିଏ ଚିନ୍ତା କଲା । ସେ ଥଣ୍ଟରେ ଗୋଟି ଗୋଟି କରି ଗୋଡ଼ି ଆଣି ମାଠିଆରେ ପକାଇଲା । ପାଣି ଧୀରେ ଧୀରେ ଉପରକୁ ଆସିଲା । ଏହା ଦେଖି ଏକ ଚତୁର ____ ଗଛ ଡାଳରୁ ହସୁଥିଲା ।',
        embeddedQuestion: {
          type: 'word',
          prompt: 'ଶୂନ୍ୟସ୍ଥାନରେ କେଉଁ ପଶୁର ନାମ ବସିବ?',
          options: ['비ଲୁଆ', 'ସିଂହ', 'ଭାଲୁ', 'ବାଘ'],
          correctAnswer: 'ବିଲୁଆ'
        }
      },
      {
        pageNo: 3,
        text: 'କାଉଟି ପେଟଭରି ପାଣି ପିଇ ଖୁସିରେ ଉଡ଼ିଗଲା । ବିଲୁଆଟି କାଉର ବୁଦ୍ଧିକୁ ପ୍ରଶଂସା କଲା । ଆମେ ଏହି ଗପରୁ ଶିଖିଲେ ଯେ ଯେଉଁଠି ଇଚ୍ଛା, ସେଠାରେ ବାଟ ଥାଏ । କାଉ ମୋଟ ୧୪ ଥର ଥଣ୍ଟରେ ଗୋଡ଼ି ଆଣିଥିଲା ।',
        embeddedQuestion: {
          type: 'math',
          prompt: '୧୪ ସଂଖ୍ୟାର ଦୁଇଟି ଅଙ୍କ ଯୋଗ କଲେ କେତେ ହେବ? (୧+୪)',
          options: ['୩', '୪', '୫', '୬'],
          correctAnswer: '୫'
        }
      }
    ]
  },
  {
    id: 'lion-mouse',
    title: 'ପଞ୍ଚତନ୍ତ୍ର: ସିଂହ ଏବଂ କ୍ଷୁଦ୍ର ମୂଷା',
    coverColor: 'from-amber-600 to-rose-700',
    description: 'ଦୟା ଓ ସାହାଯ୍ୟର ଏକ ପାରମ୍ପରିକ ଗପ ।',
    xpCost: 100,
    pages: [
      {
        pageNo: 1,
        text: 'ଗୋଟିଏ ଗୁମ୍ଫାରେ ଏକ ବଡ଼ ସିଂହ ଶୋଇଥିଲା । ଏକ ଛୋଟ ମୂଷା ଆସି ତା ଦେହ ଉପରେ ଡେଇଁ ଖେଳିବାକୁ ଲାଗିଲା । ସିଂହର ନିଦ ଭାଙ୍ଗିଗଲା । ସେ ବହୁତ କ୍ରୋଧିତ ହୋଇ ମୂଷାକୁ ତା’ର ପଞ୍ଝାରେ ଧରିନେଲା । ସିଂହର ପାଟିରେ ୩୦ ଟି ଦାନ୍ତ ଥିଲା ।',
        embeddedQuestion: {
          type: 'math',
          prompt: '୩୦ ସଂଖ୍ୟାର ଅଙ୍କ ଦ୍ଵୟର ଯୋଗଫଳ କେତେ? (୩+୦)',
          options: ['୦', '୩', '୩୦', '୬'],
          correctAnswer: '୩'
        }
      },
      {
        pageNo: 2,
        text: 'ମୂଷାଟି ଭୟରେ ଥରି ଥରି କହିଲା, "ମହାରାଜ! ମତେ ଦୟାକରି ଛାଡ଼ିଦିଅନ୍ତୁ । ମୁଁ ଦିନେ ଆପଣଙ୍କ ସାହାଯ୍ୟ କରିବି ।" ସିଂହ ହସିଲା କିନ୍ତୁ ଦୟା କରି ତାକୁ ଛାଡ଼ିଦେଲା । କିଛି ଦିନ ପରେ ସିଂହଟି ଏକ ଶିକାରୀର ____ ରେ ଛନ୍ଦି ହୋଇ ପଡ଼ି ରଡ଼ି କଲା ।',
        embeddedQuestion: {
          type: 'word',
          prompt: 'ସିଂହଟି କେଉଁଥିରେ ଛନ୍ଦି ହୋଇ ପଡ଼ିଥିଲା?',
          options: ['ଜାଲ', 'ପଞ୍ଜୁରୀ', 'ଦଉଡ଼ି', 'ଖାତ'],
          correctAnswer: 'ଜାଲ'
        }
      },
      {
        pageNo: 3,
        text: 'ମୂଷาଟି ସିଂହର ରଡ଼ି ଶୁଣି ଦୌଡ଼ି ଆସିଲା । ସେ ନିଜ ଧାରୁଆ ଦାନ୍ତରେ ଜାଲକୁ କାଟି ସିଂହକୁ ମୁକ୍ତ କଲା । ସିଂହ ମୂଷାକୁ ଧନ୍ୟବାଦ ଦେଲା । ଦୁହେଁ ଜଙ୍ଗଲରେ ଭଲ ବନ୍ଧୁ ହୋଇ ରହିଲେ । ମୂଷାଟି ଜାଲ କାଟିବାକୁ ୧୫ ମିନିଟ୍ ସମୟ ନେଇଥିଲା ।',
        embeddedQuestion: {
          type: 'math',
          prompt: '୧୫ ସଂଖ୍ୟାର ଦୁଇଟି ଅଙ୍କ ଯୋଗ କଲେ କେତେ ହେବ? (୧+୫)',
          options: ['୫', '୬', '୭', '୮'],
          correctAnswer: '୬'
        }
      }
    ]
  }
];
