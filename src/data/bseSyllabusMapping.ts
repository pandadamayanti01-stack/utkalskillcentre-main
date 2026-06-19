export interface BseSyllabusMilestone {
  key: 'ia1' | 'ia2' | 'half_yearly' | 'ia3' | 'ia4' | 'annual';
  title_en: string;
  title_or: string;
  target_date_en: string;
  target_date_or: string;
  subjects: Record<string, string[]>; // rawSubject -> list of identifying substrings/titles in Odia or English
}

// ----------------------------------------------------
// CLASS 10 (HSC) SYLLABUS MAPPING FOR SESSION 2026-27
// ----------------------------------------------------
export const BSE_SYLLABUS_MAPPING_10: BseSyllabusMilestone[] = [
  {
    key: 'ia1',
    title_en: 'Internal Assessment 1 (IA-1)',
    title_or: 'ପ୍ରଥମ ଆଭ୍ୟନ୍ତରୀଣ ମୂଲ୍ୟାଙ୍କନ (IA-1)',
    target_date_en: '2nd Week of July 2026',
    target_date_or: 'ଜୁଲାଇ ୨ୟ ସପ୍ତାହ, ୨୦୨୬',
    subjects: {
      algebra: ['ସରଳ ସହସମୀକରଣ', 'ଦ୍ଵିଘାତ ସମୀକରଣ'],
      geometry: ['ବୃତ୍ତ', 'ପରିମିତି'],
      physical_science: ['ରାସାୟନିକ ପ୍ରତିକ୍ରିୟା', 'ଅମ୍ଳ, କ୍ଷାରକ', 'ଧାତୁ ଓ ଅଧାତୁ'],
      life_science: ['ପୋଷଣ', 'ଶ୍ଵସନ', 'ପରିବହନ ଓ ସଞ୍ଚାଳନ'],
      social_science: ['ଭାରତୀୟ ଜାତୀୟ ଆନ୍ଦୋଳନ', 'ରାଜ୍ୟ ପୁନର୍ଗଠନ'],
      geography: ['ସମ୍ବଳ', 'ଜୈବ ସମ୍ବଳ'],
      economics: ['ଅର୍ଥନୈତିକ ବିକାଶ'],
      english: ['All Things Bright', 'A Letter to God', 'At the High School', 'A Tiger in the House'],
      odia: ['ବନ୍ଦେ ଉତ୍କଳ ଜନନୀ', 'ଭୀମଙ୍କ ସିଂହନାଦ', 'ଲକ୍ଷ୍ମୀକାନ୍ତ ମହାପାତ୍ର', 'ଜନ୍ମଭୂମି', 'କାଠ']
    }
  },
  {
    key: 'ia2',
    title_en: 'Internal Assessment 2 (IA-2)',
    title_or: 'ଦ୍ୱିତୀୟ ଆଭ୍ୟନ୍ତରୀଣ ମୂଲ୍ୟାଙ୍କନ (IA-2)',
    target_date_en: 'Last Week of August 2026',
    target_date_or: 'ଅଗଷ୍ଟ ଶେଷ ସପ୍ତାହ, ୨୦୨୬',
    subjects: {
      algebra: ['ସ୍ଥାନାଙ୍କ ଜ୍ୟାମିତି'],
      geometry: ['ସ୍ପର୍ଶକ', 'ତ୍ରିକୋଣମିତି', 'ଅଙ୍କନ'],
      physical_science: ['ପ୍ରତିଫଳନ', 'ମାନବ ଚକ୍ଷୁ'],
      life_science: ['ରେଚନ', 'ନିୟନ୍ତ୍ରଣ', 'ଜନନ'],
      social_science: ['ସ୍ଵତନ୍ତ୍ର ଓଡ଼ିଶା', 'ଭାରତରେ ଗଣତନ୍ତ୍ର'],
      geography: ['ଜଳ ସମ୍ବଳ', 'ଖଣିଜ ସମ୍ବଳ', 'ଶକ୍ତି ସମ୍ବଳ'],
      economics: ['ଅର୍ଥନୈତିକ ବ୍ୟବସ୍ଥା'],
      english: ['Solitary Reaper', 'Festivals of North-East', 'The Beggar', 'Great Son of India'],
      odia: ['ରାଘବଙ୍କ', 'ଚିଲିକାରେ', 'ସଭ୍ୟତା ଓ ବିଜ୍ଞାନ', 'କାଳର କପୋଳ', 'ଫଲ୍ଗୁ']
    }
  },
  {
    key: 'half_yearly',
    title_en: 'Half-Yearly Examination',
    title_or: 'ଅର୍ଦ୍ଧବାର୍ଷିକ ପରୀକ୍ଷା (Half-Yearly)',
    target_date_en: '1st Week of September 2026',
    target_date_or: 'ସେପ୍ଟେମ୍ବର ୧ମ ସପ୍ତାହ, ୨୦୨୬',
    subjects: {
      algebra: ['ସରଳ ସହସମୀକରଣ', 'ଦ୍ଵିଘାତ ସମୀକରଣ', 'ସ୍ଥାନାଙ୍କ ଜ୍ୟାମିତି'],
      geometry: ['ବୃତ୍ତ', 'ପରିମିତି', 'ସ୍ପର୍ଶକ', 'ତ୍ରିକୋଣମିତି', 'ଅଙ୍କନ'],
      physical_science: ['ରାସାୟନିକ ପ୍ରତିକ୍ରିୟା', 'ଅମ୍ଳ, କ୍ଷାରକ', 'ଧାତୁ ଓ ଅଧାତୁ', 'ପ୍ରତିଫଳନ', 'ମାନବ ଚକ୍ଷୁ'],
      life_science: ['ପୋଷଣ', 'ଶ୍ଵସନ', 'ପରିବହନ ଓ ସଞ୍ଚାଳନ', 'ରେଚନ', 'ନିୟନ୍ତ୍ରଣ', 'ଜନନ'],
      social_science: ['ଭାରତୀୟ ଜାତୀୟ ଆନ୍ଦୋଳନ', 'ରାଜ୍ୟ ପୁନର୍ଗଠନ', 'ସ୍ଵତନ୍ତ୍ର ଓଡ଼ିଶା', 'ଭାରତରେ ଗଣତନ୍ତ୍ର'],
      geography: ['ସମ୍ବଳ', 'ଜୈବ ସମ୍ବଳ', 'ଜଳ ସମ୍ବଳ', 'ଖଣିଜ ସମ୍ବଳ', 'ଶକ୍ତି ସମ୍ବଳ'],
      economics: ['ଅର୍ଥନୈତିକ ବିକାଶ', 'ଅର୍ଥନୈତିକ ବ୍ୟବସ୍ଥା'],
      english: ['All Things Bright', 'A Letter to God', 'At the High School', 'A Tiger in the House', 'Solitary Reaper', 'Festivals of North-East', 'The Beggar', 'Great Son of India'],
      odia: ['ବନ୍ଦେ ଉତ୍କଳ ଜନନୀ', 'ଭୀମଙ୍କ ସିଂହନାଦ', 'ଲକ୍ଷ୍ମୀକାନ୍ତ ମହାପାତ୍ର', 'ଜନ୍ମଭୂମି', 'କାଠ', 'ରାଘବଙ୍କ', 'ଚିଲିକାରେ', 'ସଭ୍ୟତା ଓ ବିଜ୍ଞାନ', 'କାଳର କପୋଳ', 'ଫଲ୍ଗୁ']
    }
  },
  {
    key: 'ia3',
    title_en: 'Internal Assessment 3 (IA-3)',
    title_or: 'ତୃତୀୟ ଆଭ୍ୟନ୍ତରୀଣ ମୂଲ୍ୟାଙ୍କନ (IA-3)',
    target_date_en: '1st Week of November 2026',
    target_date_or: 'ନଭେମ୍ବର ୧ମ ସପ୍ତାହ, ୨୦୨୬',
    subjects: {
      algebra: ['ସମ୍ଭାବ୍ୟତା', 'ସମାନ୍ତର ପ୍ରଗତି'],
      geometry: ['ସାଦୃଶ୍ୟ', 'ତ୍ରିକୋଣମିତି', 'ଅଙ୍କନ'],
      physical_science: ['କାର୍ବନ', 'ପର୍ଯ୍ୟାୟୀ ଶ୍ରେଣୀକରଣ', 'ବିଦ୍ୟୁତ୍'],
      life_science: ['ବଂଶାନୁକ୍ରମ', 'ଶକ୍ତିର ଉତ୍ସ', 'ଆମ ପରିବେଶ'],
      social_science: ['୨୦୦୦ ଖ୍ରୀଷ୍ଟାବ୍ଦ ପର୍ଯ୍ୟନ୍ତ', 'ସ୍ଵାଧୀନତୋତ୍ତର ଓଡ଼ିଶାର ବିକାଶ', 'ସଡ଼କ ନିରାପତ୍ତା'],
      geography: ['କୃଷି', 'ବିନିର୍ମାଣ ଉଦ୍ୟୋଗ'],
      economics: ['ଅର୍ଥନୈତିକ ବ୍ୟବସ୍ଥା', 'ଉଦ୍ୟୋଗ ବିକାଶ'],
      english: ['Air Pollution', 'Village Song', 'The Flower-School', 'The Village Judge', 'A Grain as big as a Hen'],
      odia: ['ମଙ୍ଗଳେ ଅଇଲା ଉଷା', 'ଜାଗ ବନ୍ଧନହରା', 'ସର୍ବଂସହା ମାଟି', 'ମାତୃଭାଷା', 'ନରେନ୍ଦ୍ର', 'କୋଣାର୍କ']
    }
  },
  {
    key: 'ia4',
    title_en: 'Internal Assessment 4 (IA-4)',
    title_or: 'ଚତୁର୍ଥ ଆଭ୍ୟନ୍ତରୀଣ ମୂଲ୍ୟାଙ୍କନ (IA-4)',
    target_date_en: '1st Week of January 2027',
    target_date_or: 'ଜାନୁଆରୀ ୧ମ ସପ୍ତାହ, ୨୦୨୭',
    subjects: {
      algebra: ['ପରିସଂଖ୍ୟାନ', 'ସଡ଼କ ସୁରକ୍ଷା ଶିକ୍ଷା'],
      geometry: ['ପରିମିତି'],
      physical_science: ['ଚୁମ୍ବକୀୟ ପ୍ରଭାବ'],
      life_science: ['ପ୍ରାକୃତିକ ସମ୍ପଦର ସଂରକ୍ଷଣ', 'କୋଭିଡ଼-୧୯', 'ମହାମାରୀ'],
      social_science: ['ବୈଦେଶିକ ନୀତି'],
      geography: ['ଜଳବାୟୁ ଜନିତ', 'ପରିବହନ, ଯୋଗାଯୋଗ', 'ବିପର୍ଯ୍ୟୟ'],
      english: ['Formalin Jar', "School's Goodbye", 'Direct and Indirect Speech'],
      odia: ['ଓଡ଼ିଆ ସାହିତ୍ୟ କଥା', 'ବେଲ, ଅଶ୍ବତ୍ଥ', 'ଟିପ୍ପଣୀ']
    }
  },
  {
    key: 'annual',
    title_en: 'Annual Board Examination',
    title_or: 'ବାର୍ଷିକ ବୋର୍ଡ ପରୀକ୍ଷା (Annual Board Exam)',
    target_date_en: 'Last Week of February 2027',
    target_date_or: 'ଫେବୃଆରୀ ଶେଷ ସପ୍ତାହ, ୨୦୨୭',
    subjects: {
      algebra: ['ସରଳ ସହସମୀକରଣ', 'ଦ୍ଵିଘାତ ସମୀକରଣ', 'ସମାନ୍ତର ପ୍ରଗତି', 'ସ୍ଥାନାଙ୍କ ଜ୍ୟାମିତି', 'ସମ୍ଭାବ୍ୟତା', 'ପରିସଂଖ୍ୟାନ', 'ସଡ଼କ ସୁରକ୍ଷା'],
      geometry: ['ସାଦୃଶ୍ୟ', 'ବୃତ୍ତ', 'ସ୍ପର୍ଶକ', 'ତ୍ରିକୋଣମିତି', 'ପରିମିତି', 'ଅଙ୍କନ'],
      physical_science: ['ରାସାୟନିକ', 'ଅମ୍ଳ', 'ଧାତୁ', 'ପ୍ରତିଫଳନ', 'ମାନବ ଚକ୍ଷୁ', 'କାର୍ବନ', 'ଶ୍ରେଣୀକରଣ', 'ବିଦ୍ୟୁତ୍', 'ଚୁମ୍ବକୀୟ'],
      life_science: ['ପୋଷଣ', 'ଶ୍ଵସନ', 'ପରିବହନ', 'ରେଚନ', 'ନିୟନ୍ତ୍ରଣ', 'ଜନନ', 'ବଂଶାନୁକ୍ରମ', 'ଶକ୍ତିର ଉତ୍ସ', 'ପରିବେଶ', 'ସଂରକ୍ଷଣ', 'ମହାମାରୀ'],
      social_science: ['ଆନ୍ଦୋଳନ', 'ରାଜ୍ୟ ପୁନର୍ଗଠନ', 'ଓଡ଼ିଶା ପ୍ରଦେଶ', 'ଗଣତନ୍ତ୍ର', '୨୦୦୦ ଖ୍ରୀଷ୍ଟାବ୍ଦ', 'ବିକାଶ', 'ସଡ଼କ ନିରାପତ୍ତା', 'ବୈଦେଶିକ ਨୀତି'],
      geography: ['ସମ୍ବଳ', 'ଜୈବ ସମ୍ବଳ', 'ଜଳ ସମ୍ବଳ', 'ଖଣିଜ', 'ଶକ୍ତି', 'କୃଷି', 'ଉଦ୍ୟୋଗ', 'ଜଳବାୟୁ', 'ପରିବହନ', 'ବିପର୍ଯ୍ୟୟ'],
      economics: ['ଅର୍ଥନୈତିକ ବିକାଶ', 'ବ୍ୟବସ୍ଥା', 'ଉଦ୍ୟୋଗ ବିକାଶ'],
      english: ['All Things Bright', 'A Letter to God', 'At the High School', 'A Tiger', 'Solitary Reaper', 'Festivals', 'The Beggar', 'Great Son', 'Air Pollution', 'Village Song', 'Flower-School', 'Village Judge', 'Grain as big', 'Formalin Jar', "School's Goodbye"],
      odia: ['ବନ୍ଦେ ଉତ୍କଳ', 'ସିଂହନାଦ', 'ମହାପାତ୍ର', 'ଜନ୍ମଭୂମି', 'କାଠ', 'ରାଘବଙ୍କ', 'ଚିଲିକାରେ', 'ସଭ୍ୟତା', 'କପୋଳ', 'ଫଲ୍ଗୁ', 'ଉଷା', 'ବନ୍ଧନହରା', 'ମାଟି', 'ମାତୃଭାଷା', 'ନରେନ୍ଦ୍ର', 'କୋଣାର୍କ', 'ଓଡ଼ିଆ ସାହିତ୍ୟ', 'ବେଲ']
    }
  }
];

// ----------------------------------------------------
// CLASS 9 SYLLABUS MAPPING FOR SESSION 2026-27
// ----------------------------------------------------
export const BSE_SYLLABUS_MAPPING_9: BseSyllabusMilestone[] = [
  {
    key: 'ia1',
    title_en: 'Internal Assessment 1 (IA-1)',
    title_or: 'ପ୍ରଥମ ଆଭ୍ୟନ୍ତରୀଣ ମୂଲ୍ୟାଙ୍କନ (IA-1)',
    target_date_en: '2nd Week of July 2026',
    target_date_or: 'ଜୁଲାଇ ୨ୟ ସପ୍ତାହ, ୨୦୨୬',
    subjects: {
      algebra: ['ସେଟ୍ ପ୍ରକ୍ରିୟା', 'ବାସ୍ତବ ସଂଖ୍ୟା'],
      geometry: ['ରେଖା ଓ କୋଣ', 'ତ୍ରିଭୁଜମାନଙ୍କ', 'ଅଙ୍କନ'],
      physical_science: ['ଚତୁଃପାର୍ଶ୍ଵରେ ଥିବା ପଦାର୍ଥ', 'ପଦାର୍ଥ ବିଶୁଦ୍ଧ କି'],
      life_science: ['ଜୈବ ବିବିଧତା'],
      social_science: ['ବିଶ୍ୱର କେତେକ', 'ମୌଳିକ ଅଧିକାର'],
      geography: ['ଭାରତ'],
      economics: ['ଅର୍ଥନୈତିକ ବିକାଶ'],
      english: ['Priceless Gift', 'Home and Love', 'Trunk of Ganesh'],
      odia: ['ବନ୍ଦେ ଉତ୍କଳ', 'କାହା ମୁଖ', 'ଜାତୀୟ ଜୀବନ', 'ବୁଢ଼ା ଶଙ୍ଖାରି']
    }
  },
  {
    key: 'ia2',
    title_en: 'Internal Assessment 2 (IA-2)',
    title_or: 'ଦ୍ୱିତୀୟ ଆଭ୍ୟନ୍ତରୀଣ ମୂଲ୍ୟାଙ୍କନ (IA-2)',
    target_date_en: 'Last Week of August 2026',
    target_date_or: 'ଅଗଷ୍ଟ ଶେଷ ସପ୍ତାହ, ୨୦୨୬',
    subjects: {
      algebra: ['ପରିପ୍ରକାଶ ଓ ଅଭେଦ', 'ସମୀକରଣ'],
      geometry: ['ପରିମିତି', 'ଅଙ୍କନ', 'ତ୍ରିକୋଣମିତି'],
      physical_science: ['ଗତି', 'ବଳ ଓ ଗତି'],
      life_science: ['ଜୀବ କୋଷ', 'ଖାଦ୍ୟ ସମ୍ପଦ'],
      social_science: ['ନୂତନ ବିଶ୍ୱ', 'ମାନବାଧିକାର', 'ସୂଚନା ଅଧିକାର'],
      geography: ['ଭାରତର ନଦୀ'],
      economics: ['ମୁଦ୍ରା, ବ୍ୟାଙ୍କିଙ୍ଗ୍'],
      english: ['Swimmer', 'Road Safety', 'Nine Gold', 'Lost Child'],
      odia: ['ପଦ୍ମ', 'କଲମ', 'ଭାଷା ଓ ଜାତୀୟତା', 'ବାମନର ହାତ', 'ପତାକା', 'ଦଳ ବେହେରା']
    }
  },
  {
    key: 'half_yearly',
    title_en: 'Half-Yearly Examination',
    title_or: 'ଅର୍ଦ୍ଧବାର୍ଷିକ ପରୀକ୍ଷା (Half-Yearly)',
    target_date_en: '1st Week of September 2026',
    target_date_or: 'ସେପ୍ଟେମ୍ବର ୧ମ ସପ୍ତାହ, ୨୦୨୬',
    subjects: {
      algebra: ['ସେଟ୍ ପ୍ରକ୍ରିୟା', 'ବାସ୍ତବ ସଂଖ୍ୟା', 'ପରିପ୍ରକାଶ ଓ ଅଭେଦ', 'ସମୀକରଣ'],
      geometry: ['ରେଖା ଓ କୋଣ', 'ତ୍ରିଭୁଜମାନଙ୍କ', 'ଅଙ୍କନ', 'ପରିମିତି', 'ତ୍ରିକୋଣମିତି'],
      physical_science: ['ଚତୁଃପାର୍ଶ୍ଵରେ ଥିବା ପଦାର୍ଥ', 'ପଦାର୍ଥ ବିଶୁଦ୍ଧ କି', 'ଗତି', 'ବଳ ଓ ଗତି'],
      life_science: ['ଜୈବ ବିବିଧତା', 'ଜୀବ କୋଷ', 'ଖାଦ୍ୟ ସମ୍ପଦ'],
      social_science: ['ବିଶ୍ୱର କେତେକ', 'ମୌଳିକ ଅଧିକାର', 'ନୂତନ ବିଶ୍ୱ', 'ମାନବାଧିକାର', 'ସୂଚନା ଅଧିକାର'],
      geography: ['ଭାରତ', 'ଭାରତର ନଦୀ'],
      economics: ['ଅର୍ଥନୈତିକ ବିକାଶ', 'ମୁଦ୍ରା, ବ୍ୟାଙ୍କିଙ୍ଗ୍'],
      english: ['Priceless Gift', 'Home and Love', 'Trunk of Ganesh', 'Swimmer', 'Road Safety', 'Nine Gold', 'Lost Child'],
      odia: ['ବନ୍ଦେ ଉତ୍କଳ', 'କାହା ମୁଖ', 'ଜାତୀୟ ଜୀବନ', 'ବୁଢ଼ା ଶଙ୍ଖାରି', 'ପଦ୍ମ', 'କଲମ', 'ଭାଷା ଓ ଜାତୀୟତା', 'ବାମନର ହାତ', 'ପତାକା', 'ଦଳ ବେହେରା']
    }
  },
  {
    key: 'ia3',
    title_en: 'Internal Assessment 3 (IA-3)',
    title_or: 'ତୃତୀୟ ଆଭ୍ୟନ୍ତରୀଣ ମୂଲ୍ୟାଙ୍କନ (IA-3)',
    target_date_en: 'Last Week of November 2026',
    target_date_or: 'ନଭେମ୍ବର ଶେଷ ସପ୍ତାହ, ୨୦୨୬',
    subjects: {
      algebra: ['ସ୍ଥାନାଙ୍କ ଜ୍ୟାମିତି', 'ଅନୁପାତ ଓ ସମାନୁପାତ'],
      geometry: ['ଚତୁର୍ଭୁଜ', 'କ୍ଷେତ୍ରଫଳ', 'ଅଙ୍କନ'],
      physical_science: ['ପରମାଣୁ ଓ ଅଣୁ', 'ପରମାଣୁ ଗଠନ', 'ମହାକର୍ଷଣ'],
      life_science: ['ଟିସୁ ତନ୍ତ୍ର', 'ରୋଗ ଓ ତାହାର'],
      social_science: ['୧୯୪୫ ପରବର୍ତ୍ତୀ', 'ଭାରତୀୟ ଜାତୀୟତାବାଦ'],
      geography: ['ଜଳବାୟୁ', 'ପ୍ରାକୃତିକ ଉଦ୍ଭିଦ'],
      english: ['Missile Man', 'Noble Nature', 'No men are foreign', 'First Step', 'Magic Flute'],
      odia: ['ମଣିଷ ଭାଇ', 'ଗୋପ ପ୍ରୟାଣ', 'ପ୍ରକୃତ ବନ୍ଧୁ', 'ସମୂହ ଦୃଷ୍ଟି', 'ଲକ୍ଷ୍ମୀର']
    }
  },
  {
    key: 'ia4',
    title_en: 'Internal Assessment 4 (IA-4)',
    title_or: 'ଚତୁର୍ଥ ଆଭ୍ୟନ୍ତରୀଣ ମୂଲ୍ୟାଙ୍କନ (IA-4)',
    target_date_en: '3rd Week of February 2027',
    target_date_or: 'ଫେବୃଆରୀ ୩ୟ ସପ୍ତାହ, ୨୦୨୭',
    subjects: {
      algebra: ['ପରିସଂଖ୍ୟାନ', 'ସମ୍ଭାବ୍ୟତା'],
      geometry: ['ପରିମିତି', 'ଅଙ୍କନ', 'ତ୍ରିକୋଣମିତି'],
      physical_science: ['କାର୍ଯ୍ୟ ଓ ଶକ୍ତି', 'ଧ୍ୱନି'],
      life_science: ['ପ୍ରାକୃତିକ ସମ୍ପଦ', 'ମହାମାରୀ'],
      social_science: ['ଭାରତର ଐତିହ୍ୟ', 'ସଂଯୁକ୍ତ ରାଷ୍ଟ୍ରସଂଘ'],
      geography: ['ଜନସଂଖ୍ୟା', 'ମାନବୀୟ ବିପତ୍ତି'],
      economics: ['ଧାରଣୀୟ ବିକାଶ'],
      english: ['A Hero', 'Alexander Selkirk', 'portrait of a lady'],
      odia: ['ପାଇକ ବଧୂର', 'ମାଟିର ମଣିଷ', 'ଶକ୍ତି ଓ ଜ୍ଞାନ', 'ଓଡ଼ିଆ ସାହିତ୍ୟ', 'ଦୂର ପାହାଡ଼']
    }
  },
  {
    key: 'annual',
    title_en: 'Annual Examination',
    title_or: 'ବାର୍ଷିକ ପରୀକ୍ଷା (Annual Exam)',
    target_date_en: '2nd Week of March 2027',
    target_date_or: 'ମାର୍ଚ୍ଚ ୨ୟ ସପ୍ତାହ, ୨୦୨୭',
    subjects: {
      algebra: ['ସେଟ୍ ପ୍ରକ୍ରିୟା', 'ବାସ୍ତବ ସଂଖ୍ୟା', 'ପରିପ୍ରକାଶ', 'ସମୀକରଣ', 'ସ୍ଥାନାଙ୍କ ଜ୍ୟାମିତି', 'ଅନୁପାତ', 'ପରିସଂଖ୍ୟାନ', 'ସମ୍ଭାବ୍ୟତା'],
      geometry: ['ରେଖା', 'ତ୍ରିଭୁଜ', 'ଅଙ୍କନ', 'ପରିମିତି', 'ତ୍ରିକୋଣମିତି', 'ଚତୁର୍ଭୁଜ', 'କ୍ଷେତ୍ରଫଳ'],
      physical_science: ['ପଦାର୍ଥ', 'ବିଶୁଦ୍ଧ', 'ଗତି', 'ବଳ ଓ ଗତି', 'ପରମାଣୁ', 'ମହାକର୍ଷଣ', 'କାର୍ଯ୍ୟ', 'ଧ୍ୱନି'],
      life_science: ['ବିବିଧତା', 'ଜୀବ କୋଷ', 'ଖାଦ୍ୟ ସମ୍ପଦ', 'ଟିସୁ', 'ରୋଗ', 'ପ୍ରଦୂଷଣ', 'ମହାମାରୀ'],
      social_science: ['ଅଗ୍ରଗତି', 'ଅଧିକାର', 'ନୂତନ ବିଶ୍ୱ', 'ମାନବାଧିକାର', '୧୯୪୫', 'ଜାତୀୟତାବାଦ', 'ଐତିହ୍ୟ', 'ରାଷ୍ଟ୍ରସଂଘ'],
      geography: ['ଭାରତ', 'ନଦୀ', 'ଜଳବାୟୁ', 'ଉଦ୍ଭିଦ', 'ଜନସଂଖ୍ୟା', 'ବିପତ୍ତି'],
      economics: ['ବିକାଶ', 'ମୁଦ୍ରା', 'ଧାରଣୀୟ ବିକାଶ'],
      english: ['Priceless Gift', 'Home and Love', 'Trunk', 'Swimmer', 'Road Safety', 'Nine Gold', 'Lost Child', 'Missile Man', 'Noble Nature', 'foreign', 'First Step', 'Magic Flute', 'A Hero', 'Alexander', 'portrait'],
      odia: ['ବନ୍ଦେ ଉତ୍କଳ', 'କାହା ମୁଖ', 'ଜୀବନ', 'ଶଙ୍ଖାରି', 'ପଦ୍ମ', 'କଲମ', 'ଜାତୀୟତା', 'ବାମନ', 'ପତାକା', 'ବେହେରା', 'ମଣିଷ ଭାଇ', 'ଗୋପ', 'ବନ୍ଧୁ', 'ଦୃଷ୍ଟି', 'ଲକ୍ଷ୍ମୀର', 'ପାଇକ', 'ମାଟିର', 'ଶକ୍ତି', 'ସାହିତୟ', 'ପାହାଡ଼']
    }
  }
];
