import { GoogleGenerativeAI } from '@google/generative-ai';
import { App } from 'firebase-admin/app';
import { getFirestore as getAdminFirestore, FieldValue } from 'firebase-admin/firestore';
import { loadTextbookFromBucket, extractPdfText } from './dailyMcqAutomation.js';
import {
  ROADMAP_DATA_1,
  ROADMAP_DATA_2,
  ROADMAP_DATA_3,
  ROADMAP_DATA_4,
  ROADMAP_DATA_5,
  ROADMAP_DATA_6,
  ROADMAP_DATA_7,
  ROADMAP_DATA_8,
  ROADMAP_DATA_9,
  ROADMAP_DATA_10
} from '../data/roadmapData.js';

function getRoadmapForClass(className: string) {
  const digit = className.replace(/\D/g, '');
  switch (digit) {
    case '1': return ROADMAP_DATA_1;
    case '2': return ROADMAP_DATA_2;
    case '3': return ROADMAP_DATA_3;
    case '4': return ROADMAP_DATA_4;
    case '5': return ROADMAP_DATA_5;
    case '6': return ROADMAP_DATA_6;
    case '7': return ROADMAP_DATA_7;
    case '8': return ROADMAP_DATA_8;
    case '9': return ROADMAP_DATA_9;
    case '10': return ROADMAP_DATA_10;
    default: return null;
  }
}

function getGroupIndexForSubject(subject: string, className: string): number {
  const s = subject.toLowerCase().trim();
  const digit = className.replace(/\D/g, '');
  const classNum = parseInt(digit) || 10;

  // 1. Math subjects
  const isMath = s.includes('math') || s.includes('ganita') || s === 'algebra' || s === 'geometry' || s.includes('geometry') || s.includes('algebra');

  // 2. Odia subjects
  const isOdia = s.includes('odia') || s.includes('flo') || s.includes('bhasa') || s.includes('jhulana') || s.includes('sahitya') || s.includes('pallavi') || s.includes('ଓଡ଼ିଆ') || s.includes('ସାହିତ୍ୟ');

  // 3. English subjects
  const isEnglish = s.includes('english') || s.includes('sle') || s.includes('jasmine');

  // 4. Science / EVS
  const isScienceEvs = s.includes('science') || s.includes('bignana') || s.includes('jigyasa') || s.includes('paribesa') || s.includes('pruthibi') || s.includes('evs') || s.includes('ଜୀବବିଜ୍ଞାନ');

  // 5. Social Science
  const isSocialScience = s.includes('social') || s.includes('samajika') || s.includes('history') || s.includes('geography') || s.includes('political') || s.includes('economics') || s.includes('sst') || s.includes('itihasa') || s.includes('bhugola');

  // Adjust isScienceEvs to exclude if it's already Social Science
  const isScienceEvsFinal = isScienceEvs && !isSocialScience;

  // 6. Sanskrit / Hindi
  const isSanskritHindi = s.includes('sanskrit') || s.includes('hindi') || s.includes('tls') || s.includes('tlh') || s.includes('third_language');

  // 7. Art
  const isArt = s.includes('art') || s.includes('kala') || s.includes('kruti') || s.includes('drawing');

  // 8. PE / Wellness
  const isPe = s.includes('pe') || s.includes('khela') || s.includes('krida') || s.includes('sharirika') || s.includes('yoga') || s.includes('wellness') || s.includes('sports');

  // 9. Vocational
  const isVocational = s.includes('vocational') || s.includes('kausala') || s.includes('skill') || s === 'it' || s === 'retail' || s === 'travel';

  if (classNum === 1 || classNum === 2) {
    if (isMath) return 0;
    if (isOdia) return 1;
    return -1;
  }

  if (classNum >= 3 && classNum <= 5) {
    if (isMath) return 0;
    if (isScienceEvsFinal) return 1;
    if (isOdia) return 2;
    if (isEnglish) return 3;
    if (isArt) return 4;
    if (isPe) return 5;
    return -1;
  }

  if (classNum >= 6 && classNum <= 8) {
    // Math ➔ Group 0
    if (isMath) return 0;
    // English ➔ Group 1
    if (isEnglish) return 1;
    // Science / Art ➔ Group 2
    if (isScienceEvsFinal || isArt) return 2;
    // Social Science / PE ➔ Group 3
    if (isSocialScience || isPe) return 3;
    // Odia / Vocational ➔ Group 4
    if (isOdia || isVocational) return 4;
    // Sanskrit / Hindi ➔ Group 5
    if (isSanskritHindi) return 5;
    return -1;
  }

  // Class 9 & 10
  if (isMath) return 0;
  if (isScienceEvsFinal) return 1;
  if (isSocialScience) return 2;
  if (isOdia) return 3;
  if (isEnglish) return 4;
  if (isSanskritHindi || isVocational) return 5;
  return -1;
}

function getGroupName(groupIdx: number, className: string): string {
  const digit = className.replace(/\D/g, '');
  const classNum = parseInt(digit) || 10;

  if (classNum === 1 || classNum === 2) {
    switch (groupIdx) {
      case 0: return 'Mathematics';
      case 1: return 'First Language (Odia)';
      default: return 'Other';
    }
  }

  if (classNum >= 3 && classNum <= 5) {
    switch (groupIdx) {
      case 0: return 'Mathematics';
      case 1: return 'Science / EVS';
      case 2: return 'First Language (Odia)';
      case 3: return 'Second Language (English)';
      case 4: return 'Art Education';
      case 5: return 'Physical Education';
      default: return 'Other';
    }
  }

  if (classNum >= 6 && classNum <= 8) {
    switch (groupIdx) {
      case 0: return 'Mathematics';
      case 1: return 'Second Language (English)';
      case 2: return 'Science & Art';
      case 3: return 'Social Science & PE';
      case 4: return 'Odia & Vocational';
      case 5: return 'Third Language (Sanskrit / Hindi)';
      default: return 'Other';
    }
  }

  // Class 9 & 10
  switch (groupIdx) {
    case 0: return 'Mathematics';
    case 1: return 'General Science';
    case 2: return 'Social Science';
    case 3: return 'First Language (Odia)';
    case 4: return 'Second Language (English)';
    case 5: return 'Third Language / Vocational';
    default: return 'Other';
  }
}

function getRotatorKeys(): string[] {
  // Rotation is disabled for production. We strictly stick to the single premium GEMINI_API_KEY.
  const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
  return apiKey ? [apiKey] : [];
}

function getMtsSubjectType(subjectName: string): 'math' | 'science_social' | 'language' {
  const s = subjectName.toLowerCase().trim();
  if (s.includes('math') || s.includes('algebra') || s.includes('geometry')) {
    return 'math';
  }
  if (
    s.includes('science') || 
    s.includes('history') || 
    s.includes('geography') || 
    s.includes('social') || 
    s.includes('physics') || 
    s.includes('chemistry') || 
    s.includes('biology') || 
    s.includes('evs')
  ) {
    return 'science_social';
  }
  return 'language';
}

async function generateTestViaGemini(
  className: string,
  subjectName: string,
  chapters: string[],
  language: 'en' | 'or',
  chapterTextContext: string
): Promise<any> {
  const rotatorKeys = getRotatorKeys();
  if (rotatorKeys.length === 0) {
    throw new Error('GEMINI_API_KEY is not configured on the server');
  }

  let languageInstruction = '';
  if (language === 'or') {
    languageInstruction = `Odia (using Odia script for student content).
    SUBJECT-SPECIFIC RULES:
    - For "English" subject: The terms/questions MUST be in English only.
    - For "Sanskrit" / "Hindi" subjects: The terms/questions MUST be in Sanskrit / Hindi.
    - For "Mathematics", "Science", and "Social Science" subjects: The questions and options MUST be in Odia (but keep mathematical numbers, equations, or scientific variables clean using standard English/Arabic numerals like 5, x, y, a^2 + b^2).`;
  } else {
    languageInstruction = `English.
    SUBJECT-SPECIFIC RULES:
    - For "Odia" / "Sanskrit" / "Hindi" subjects: The questions MUST be in their respective scripts.
    - For all other subjects: The questions MUST be in English.`;
  }

  const classNum = className ? (parseInt(className.replace(/\D/g, '')) || 10) : 10;
  
  let structureDescription = '';
  let outputStructure = '';

  if (classNum >= 1 && classNum <= 5) {
    structureDescription = `
    - Exactly 5 MCQ (1 Mark each, with 'options' array containing 4 choices, and 'type' set to "mcq")
    - Exactly 3 short answer/subjective (2 Marks each, with empty 'options' array, and 'type' set to "subjective")
    - Exactly 3 medium answer/subjective (3 Marks each, with empty 'options' array, and 'type' set to "subjective")
    - Exactly 1 long answer/subjective (5 Marks, with empty 'options' array, and 'type' set to "subjective")
    Total: 25 Marks (12 Questions).
    `;
    outputStructure = `
    {
      "questions": [
        {
          "question": "Question text",
          "type": "mcq",
          "marks": 1,
          "options": ["Option A", "Option B", "Option C", "Option D"],
          "correct_answer": "Correct option text exactly matching one of the options"
        },
        ... 5 MCQs total ...
        {
          "question": "Subjective question text",
          "type": "subjective",
          "marks": 2,
          "options": [],
          "correct_answer": "Model solution or step-by-step hint explaining the answer key"
        },
        ... 3 of 2 Marks, 3 of 3 Marks, 1 of 5 Marks ...
      ]
    }
    `;
  } else if (classNum >= 6 && classNum <= 8) {
    structureDescription = `
    - Exactly 10 MCQ (1 Mark each, with 'options' array containing 4 choices, and 'type' set to "mcq")
    - Exactly 5 short answer/subjective (2 Marks each, with empty 'options' array, and 'type' set to "subjective")
    - Exactly 5 medium answer/subjective (3 Marks each, with empty 'options' array, and 'type' set to "subjective")
    - Exactly 2 long answer/subjective (5 Marks each, with empty 'options' array, and 'type' set to "subjective")
    Total: 45 Marks (22 Questions).
    `;
    outputStructure = `
    {
      "questions": [
        {
          "question": "Question text",
          "type": "mcq",
          "marks": 1,
          "options": ["Option A", "Option B", "Option C", "Option D"],
          "correct_answer": "Correct option text exactly matching one of the options"
        },
        ... 10 MCQs total ...
        {
          "question": "Subjective question text",
          "type": "subjective",
          "marks": 2,
          "options": [],
          "correct_answer": "Model solution or step-by-step hint explaining the answer key"
        },
        ... 5 of 2 Marks, 5 of 3 Marks, 2 of 5 Marks ...
      ]
    }
    `;
  } else {
    const subjectType = getMtsSubjectType(subjectName);
    if (subjectType === 'science_social') {
      structureDescription = `
      - Exactly 10 MCQ (1 Mark each, with 'options' array containing 4 choices, and 'type' set to "mcq")
      - Exactly 12 subjective questions (with empty 'options' array, and 'type' set to "subjective"):
        * The first 4 questions (index 0 to 3) must be worth 2 Marks each (assign "marks": 2)
        * The next 4 questions (index 4 to 7) must be worth 3 Marks each (assign "marks": 3)
        * The last 4 questions (index 8 to 11) must be worth 5 Marks each (assign "marks": 5)
      Total: 50 Marks (22 Questions).
      `;
      outputStructure = `
      {
        "questions": [
          {
            "question": "Question text",
            "type": "mcq",
            "marks": 1,
            "options": ["Option A", "Option B", "Option C", "Option D"],
            "correct_answer": "Correct option text exactly matching one of the options"
          },
          ... 10 MCQs total ...
          {
            "question": "Subjective question text",
            "type": "subjective",
            "marks": 2,
            "options": [],
            "correct_answer": "Model solution or step-by-step hint explaining the answer key"
          },
          ... 4 of 2 Marks, 4 of 3 Marks, 4 of 5 Marks ...
        ]
      }
      `;
    } else if (subjectType === 'math') {
      structureDescription = `
      - Exactly 10 MCQ (1 Mark each, with 'options' array containing 4 choices, and 'type' set to "mcq")
      - Exactly 8 subjective questions (with empty 'options' array, and 'type' set to "subjective"):
        * All 8 questions must strictly be worth 5 Marks each (assign "marks": 5 for all of them)
      Total: 50 Marks (18 Questions).
      `;
      outputStructure = `
      {
        "questions": [
          {
            "question": "Question text",
            "type": "mcq",
            "marks": 1,
            "options": ["Option A", "Option B", "Option C", "Option D"],
            "correct_answer": "Correct option text exactly matching one of the options"
          },
          ... 10 MCQs total ...
          {
            "question": "Long Mathematics/Geometry proof or derivation question text",
            "type": "subjective",
            "marks": 5,
            "options": [],
            "correct_answer": "Detailed step-by-step mathematical proof or solution key"
          },
          ... 8 subjective questions of 5 Marks each ...
        ]
      }
      `;
    } else {
      // Language / Vocational
      structureDescription = `
      - Exactly 10 MCQ (1 Mark each, with 'options' array containing 4 choices, and 'type' set to "mcq")
      - Exactly 10 subjective questions (with empty 'options' array, and 'type' set to "subjective"):
        * The first 4 questions (index 0 to 3) must be worth 2 Marks each (assign "marks": 2)
        * The next 4 questions (index 4 to 7) must be worth 3 Marks each (assign "marks": 3)
        * The last 2 questions (index 8 to 9) must be worth 10 Marks each (assign "marks": 10, typically board-style essays, formal letters, translations, or comprehensions)
      Total: 50 Marks (20 Questions).
      `;
      outputStructure = `
      {
        "questions": [
          {
            "question": "Question text",
            "type": "mcq",
            "marks": 1,
            "options": ["Option A", "Option B", "Option C", "Option D"],
            "correct_answer": "Correct option text exactly matching one of the options"
          },
          ... 10 MCQs total ...
          {
            "question": "Subjective question text",
            "type": "subjective",
            "marks": 2,
            "options": [],
            "correct_answer": "Model solution or step-by-step hint explaining the answer key"
          },
          ... 4 of 2 Marks, 4 of 3 Marks, 2 of 10 Marks ...
        ]
      }
      `;
    }
  }

  const prompt = `You are an expert curriculum builder and Board exam paper setter for the Board of Secondary Education (BSE) Odisha.
  Generate exactly the monthly test paper questions of MEDIUM difficulty on the active chapters: "${chapters.join(', ')}" in the subject "${subjectName}" for standard "${className}".

  CRITICAL REQUIREMENTS:
  - The questions must follow this specific structure of questions:
    ${structureDescription}
  - The questions must be highly important from a board exam perspective, focusing on active syllabus concepts.
  - The subjective questions and their model answers/hints must follow the official BSE Odisha board exam pattern style, structure, and standard terminology.
  - Do NOT use raw LaTeX mathematical symbols or formatting delimiters (like $$, $, \\[, \\], \\frac, \\sqrt). Instead, use standard plain text or standard Unicode symbols (like ÷, ×, ±, ≈, ≠, ≤, ≥, ∞, •, α, β, θ, π, √, ^) so that it renders clearly on any device screen.

  ${chapterTextContext ? `Here is the textbook chapter content to base your questions on:\n\n${chapterTextContext}\n\n` : ''}

  ${languageInstruction}

  Provide the output in JSON format with the following structure:
  ${outputStructure}
  Do not include any extra introductory or explanatory text. Return ONLY the JSON object.`;

  let lastError = null;
  for (const keyToUse of rotatorKeys) {
    try {
      console.log(`[Auto Monthly Test AI] Attempting generation using key ${keyToUse.substring(0, 12)}...`);
      const ai = new GoogleGenerativeAI(keyToUse);
      const model = ai.getGenerativeModel({
        model: "gemini-2.5-flash",
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.7,
        }
      }, { apiVersion: "v1beta" });

      const result = await model.generateContent(prompt);
      let responseText = result.response.text();
      
      const cleanJson = responseText.replace(/```json\n?|```/g, '').trim();
      return JSON.parse(cleanJson);
    } catch (error: any) {
      lastError = error;
      console.warn(`Attempt failed using key ${keyToUse.substring(0, 12)}:`, error.message);
    }
  }
  throw lastError || new Error('Failed to generate test using all available API keys');
}

export async function generateMonthlyTestsForMonth(
  adminApp: App,
  databaseId: string,
  targetMonthString: string, // e.g. "June 2026"
  forceRegenerate: boolean = false
) {
  const db = getAdminFirestore(adminApp, databaseId);
  console.log(`[MonthlyTestAuto] Initializing automated Monthly Test generation for: ${targetMonthString}`);

  // 1. Calculate schedule dates starting on the 5th, skipping Sundays
  const parts = targetMonthString.split(' ');
  const monthName = parts[0];
  const year = parseInt(parts[1]) || new Date().getFullYear();

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const monthIndex = monthNames.indexOf(monthName);
  if (monthIndex === -1) {
    throw new Error(`Invalid month name in target month: ${targetMonthString}`);
  }

  const scheduleDates: string[] = [];
  const pointer = new Date(year, monthIndex, 5);

  for (let groupIdx = 0; groupIdx < 6; groupIdx++) {
    while (pointer.getDay() === 0) { // 0 = Sunday
      pointer.setDate(pointer.getDate() + 1);
    }
    const yyyy = pointer.getFullYear();
    const mm = String(pointer.getMonth() + 1).padStart(2, '0');
    const dd = String(pointer.getDate()).padStart(2, '0');
    scheduleDates[groupIdx] = `${yyyy}-${mm}-${dd}`;
    pointer.setDate(pointer.getDate() + 1);
  }

  console.log(`[MonthlyTestAuto] Scheduled dates:`, scheduleDates);

  const results: any[] = [];

  // 2. Loop through classes 1 to 10
  for (let classDigit = 1; classDigit <= 10; classDigit++) {
    const className = `Class ${classDigit}`;
    console.log(`[MonthlyTestAuto] Processing ${className}...`);

    const roadmap = getRoadmapForClass(className);
    if (!roadmap) {
      console.log(`[MonthlyTestAuto] No roadmap found for ${className}. Skipping.`);
      continue;
    }

    const monthRoadmap = roadmap.find(entry => entry.month === targetMonthString);
    if (!monthRoadmap || !Array.isArray(monthRoadmap.chapters) || monthRoadmap.chapters.length === 0) {
      console.log(`[MonthlyTestAuto] No chapters found for ${className} in ${targetMonthString}. Skipping.`);
      continue;
    }

    // Group chapters by exam group index
    const chaptersByGroup: Record<number, any[]> = {
      0: [], 1: [], 2: [], 3: [], 4: [], 5: []
    };

    monthRoadmap.chapters.forEach(ch => {
      const idx = getGroupIndexForSubject(ch.subject, className);
      if (idx !== -1) {
        chaptersByGroup[idx].push(ch);
      } else {
        console.warn(`[MonthlyTestAuto] Subject ${ch.subject} of chapter ${ch.title} could not be mapped to any exam group.`);
      }
    });

    // Generate test for each group that has active chapters
    for (let groupIdx = 0; groupIdx < 6; groupIdx++) {
      const groupChapters = chaptersByGroup[groupIdx];
      if (groupChapters.length === 0) continue;

      const groupName = getGroupName(groupIdx, className);
      console.log(`[MonthlyTestAuto] Generating test for ${className} - Subject: ${groupName} (${groupChapters.length} chapters)...`);

      // Deterministic document ID to prevent duplicates
      const safeGroupName = groupName.toLowerCase().replace(/[^a-z0-9]+/g, '_');
      const safeMonth = targetMonthString.toLowerCase().replace(/[^a-z0-9]+/g, '_');
      const docId = `monthly_test_${classDigit}_${safeGroupName}_${safeMonth}`;

      // Check if document already exists, and skip if not forceRegenerate
      if (!forceRegenerate) {
        const docSnap = await db.collection('monthly_tests').doc(docId).get();
        if (docSnap.exists) {
          console.log(`[MonthlyTestAuto] Test ${docId} already exists. Skipping.`);
          results.push({ id: docId, class: className, subject: groupName, status: 'skipped_exists' });
          continue;
        }
      }

      // Try to load textbook buffer from Firebase Storage bucket for the first chapter
      let chapterTextContext = '';
      try {
        const firstChapter = groupChapters[0];
        const bucketResult = await loadTextbookFromBucket(adminApp, className, firstChapter.subject, firstChapter.title || firstChapter.title_en || firstChapter.title_or);
        if (bucketResult && bucketResult.driveContent?.text) {
          const parsedText = bucketResult.driveContent.text;
          if (parsedText && parsedText.trim().length > 50) {
            chapterTextContext = parsedText.substring(0, 25000);
            console.log(`[MonthlyTestAuto] Successfully loaded ${chapterTextContext.length} chars of chapter content for prompt.`);
          }
        }
      } catch (err: any) {
        console.warn(`[MonthlyTestAuto] Could not load textbook content for context, generating with LLM general knowledge:`, err.message);
      }

      // Generate questions via Gemini
      const chapterTitles = groupChapters.map(c => c.title || c.title_en || c.title_or);
      const chapterIds = groupChapters.map(c => c.id);

      try {
        const generatedResult = await generateTestViaGemini(
          className,
          groupName,
          chapterTitles,
          'or', // Default Odia language for monthly tests
          chapterTextContext
        );

        const questions = Array.isArray(generatedResult.questions) ? generatedResult.questions : [];

        if (questions.length === 0) {
          throw new Error('AI returned an empty questions array');
        }

        const payload = {
          id: docId,
          title: {
            en: `${groupName} Monthly Test - ${targetMonthString}`,
            or: `${groupName} ମାସିକ ପରୀକ୍ଷା - ${targetMonthString}`
          },
          class: className,
          subject: groupName,
          month: monthName,
          year: year,
          language: 'or',
          questions: questions,
          chapterIds: chapterIds,
          status: 'published',
          results_published: false,
          scheduledDate: scheduleDates[groupIdx],
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp()
        };

        await db.collection('monthly_tests').doc(docId).set(payload, { merge: true });
        console.log(`[MonthlyTestAuto] Successfully created and saved test: ${docId}`);
        results.push({ id: docId, class: className, subject: groupName, status: 'created' });
      } catch (genErr: any) {
        console.error(`[MonthlyTestAuto] Failed to generate test for ${className} - ${groupName}:`, genErr);
        results.push({ class: className, subject: groupName, status: 'error', error: genErr.message });
      }
    }
  }

  return results;
}

export async function publishMonthlyResultsAndRanks(
  adminApp: App,
  databaseId: string,
  targetMonthString: string
) {
  const db = getAdminFirestore(adminApp, databaseId);
  console.log(`[Auto Publish] Starting automated results compilation & rank assignment for: ${targetMonthString}`);

  const parts = targetMonthString.split(' ');
  const monthName = parts[0];
  const year = parseInt(parts[1]) || new Date().getFullYear();

  // 1. Fetch all tests for this month/year
  const testsSnap = await db.collection('monthly_tests')
    .where('month', '==', monthName)
    .where('year', '==', year)
    .get();

  if (testsSnap.empty) {
    console.log(`[Auto Publish] No monthly tests found for ${targetMonthString}.`);
    return [];
  }

  const tests = testsSnap.docs.map(d => ({ id: d.id, ...d.data() as any }));
  const results: any[] = [];

  // 2. Loop through each test to compile rankings
  for (const test of tests) {
    console.log(`[Auto Publish] Compiling rankings for test: ${test.id} (${test.subject} - ${test.class})`);

    // Fetch submissions for this test
    const subsSnap = await db.collection('monthly_test_submissions')
      .where('testId', '==', test.id)
      .get();

    if (subsSnap.empty) {
      console.log(`[Auto Publish] No submissions found for test ${test.id}. Marking results as published anyway.`);
      await db.collection('monthly_tests').doc(test.id).update({ 
        results_published: true, 
        updatedAt: FieldValue.serverTimestamp() 
      });
      results.push({ id: test.id, submissionsCount: 0, status: 'published_empty' });
      continue;
    }

    const submissions = subsSnap.docs.map(d => ({ id: d.id, ...d.data() as any }));

    // Fetch user profiles to resolve districts
    const userIds = Array.from(new Set(submissions.map(s => s.userId).filter(Boolean)));
    const userProfiles: Record<string, any> = {};

    // Batch query user profiles (Firestore limits 'in' queries to 30 items)
    for (let i = 0; i < userIds.length; i += 30) {
      const batchIds = userIds.slice(i, i + 30);
      const usersSnap = await db.collection('users')
        .where('__name__', 'in', batchIds)
        .get();
      usersSnap.forEach(udoc => {
        userProfiles[udoc.id] = udoc.data();
      });
    }

    // Attach resolved district and school
    const submissionsWithProfile = submissions.map(s => {
      const profile = userProfiles[s.userId] || {};
      const dist = s.district || profile.district || 'Khordha';
      const sch = s.school || profile.school || '';
      return { ...s, district: dist, school: sch };
    });

    // Sort globally: score desc, then submittedAt seconds asc
    submissionsWithProfile.sort((a, b) => {
      const scoreA = a.finalScore ?? a.score ?? 0;
      const scoreB = b.finalScore ?? b.score ?? 0;
      if (scoreB !== scoreA) return scoreB - scoreA;
      const timeA = a.submittedAt?.seconds || a.submittedAt?._seconds || 0;
      const timeB = b.submittedAt?.seconds || b.submittedAt?._seconds || 0;
      return timeA - timeB;
    });

    // Group by district to compute district ranks
    const districtGroups: Record<string, any[]> = {};
    submissionsWithProfile.forEach(s => {
      const dist = s.district;
      if (!districtGroups[dist]) districtGroups[dist] = [];
      districtGroups[dist].push(s);
    });

    // Sort and map district ranks
    const districtRanksMap: Record<string, number> = {};
    Object.keys(districtGroups).forEach(dist => {
      const group = districtGroups[dist];
      group.sort((a, b) => {
        const scoreA = a.finalScore ?? a.score ?? 0;
        const scoreB = b.finalScore ?? b.score ?? 0;
        if (scoreB !== scoreA) return scoreB - scoreA;
        const timeA = a.submittedAt?.seconds || a.submittedAt?._seconds || 0;
        const timeB = b.submittedAt?.seconds || b.submittedAt?._seconds || 0;
        return timeA - timeB;
      });
      group.forEach((s, idx) => {
        districtRanksMap[s.id] = idx + 1;
      });
    });

    // Update submissions with ranks (using chunked write batches of 400 to avoid Firestore limits)
    const CHUNK_SIZE = 400;
    for (let i = 0; i < submissionsWithProfile.length; i += CHUNK_SIZE) {
      const chunk = submissionsWithProfile.slice(i, i + CHUNK_SIZE);
      const writeBatch = db.batch();
      chunk.forEach((sub, cidx) => {
        const globalRank = i + cidx + 1;
        const docRef = db.collection('monthly_test_submissions').doc(sub.id);
        writeBatch.update(docRef, {
          rank: globalRank,
          districtRank: districtRanksMap[sub.id] || null,
          district: sub.district,
          school: sub.school,
          updatedAt: FieldValue.serverTimestamp()
        });
      });
      await writeBatch.commit();
    }

    // Mark test results as published
    await db.collection('monthly_tests').doc(test.id).update({
      results_published: true,
      updatedAt: FieldValue.serverTimestamp()
    });

    console.log(`[Auto Publish] Ranked and published ${submissions.length} submissions for test ${test.id}.`);
    results.push({ id: test.id, submissionsCount: submissions.length, status: 'published' });
  }

  return results;
}
