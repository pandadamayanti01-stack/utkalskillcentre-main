const admin = require('firebase-admin');
const fs = require('fs');

const { getFirestore } = require('firebase-admin/firestore');
const serviceAccount = require('./utkal-admin-sdk.json');

// Check if app is already initialized
const app = admin.apps.length === 0 
  ? admin.initializeApp({ credential: admin.credential.cert(serviceAccount) })
  : admin.apps[0];

const db = getFirestore(app, 'utkal-prod');

const MONTHS = [
  "June 2026", "July 2026", "August 2026", "September 2026",
  "October 2026", "November 2026", "December 2026",
  "January 2027", "February 2027"
];

const WEIGHTS = [0.5, 0.7, 1.2, 1.5, 1.5, 1.2, 0.7, 0.5, 0.2];
const SUM_WEIGHTS = WEIGHTS.reduce((a, b) => a + b, 0); // 8.0
const CUMULATIVE_WEIGHTS = [];
let tempSum = 0;
for (let w of WEIGHTS) {
  tempSum += w;
  CUMULATIVE_WEIGHTS.push(tempSum / SUM_WEIGHTS);
}

function isAnswerKey(title) {
  const t = String(title).toLowerCase();
  return (
    t.includes('answer') ||
    t.includes('key') ||
    t.includes('uttaramala') ||
    t.includes('solution') ||
    t.includes('uttar')
  );
}

const getChapterNumber = (c) => {
  if (typeof c.number === 'number') return c.number;
  if (typeof c.chapterNumber === 'number') return c.chapterNumber;
  if (typeof c.index === 'number') return c.index;

  const titleStr = typeof c.title === 'string' ? c.title : (c.title?.en || c.title?.or || '');
  const titleMatch = titleStr.match(/Chapter[_\-\s]?\s*(\d+)/i) || titleStr.match(/Ch[_\-\s]?\s*(\d+)/i);
  if (titleMatch) return parseInt(titleMatch[1], 10);

  const urlStr = String(c.pdfUrl || c.download_url || c.driveUrl || '');
  const decodedUrl = decodeURIComponent(urlStr);
  const urlMatch = decodedUrl.match(/Chapter[_\-\s]?(\d+)/i) || decodedUrl.match(/Ch[_\-\s]?(\d+)/i);
  if (urlMatch) return parseInt(urlMatch[1], 10);

  if (c.id && !/^[a-zA-Z0-9]{20}$/.test(c.id)) {
    const idMatch = String(c.id).match(/ch[_\-\s]?(\d+)/i);
    if (idMatch) return parseInt(idMatch[1], 10);
  }

  // Hardcode fallback for Odia Algebra/Geometry chapters missing numbers in their titles
  if (titleStr.includes('ସରଳ ସହସମୀକରଣ')) return 1;
  if (titleStr.includes('ଦ୍ଵିଘାତ ସମୀକରଣ')) return 2;
  if (titleStr.includes('ସମାନ୍ତର ପ୍ରଗତି')) return 3;
  if (titleStr.includes('ସ୍ଥାନାଙ୍କ ଜ୍ୟାମିତି')) return 4;
  if (titleStr.includes('ସମ୍ଭାବ୍ୟତା')) return 5;
  if (titleStr.includes('ପରିସଂଖ୍ୟାନ')) return 6;

  if (titleStr.includes('ଜ୍ୟାମିତିରେ ସାଦୃଶ୍ୟ')) return 1;
  if (titleStr.includes('Circle') || titleStr.includes('ବୃତ୍ତ')) return 2;
  if (titleStr.includes('Construction') || titleStr.includes('ଅଙ୍କନ')) return 3;
  if (titleStr.includes('Mensuration') || titleStr.includes('ପରିମିତି')) return 4;

  return 999;
};

async function run() {
  console.log("Fetching all chapters from Firestore...");
  const snap = await db.collection('chapters').get();
  
  let class10ChaptersBySubject = {};
  let class9ChaptersBySubject = {};

  snap.forEach(doc => {
    const data = doc.data();
    const classId = (data.class || '').toLowerCase().trim();
    const title = data.title || '';
    
    // Skip answer keys / solutions
    if (isAnswerKey(title)) return;
    if (typeof title === 'object' && (isAnswerKey(title.en || '') || isAnswerKey(title.or || ''))) return;

    const sub = data.subject || 'other';
    const chapObj = {
      id: doc.id,
      title: title,
      subject: sub,
      thumbnail: data.thumbnail || null
    };

    if (classId === '10' || classId === 'class10') {
      if (!class10ChaptersBySubject[sub]) class10ChaptersBySubject[sub] = [];
      class10ChaptersBySubject[sub].push(chapObj);
    } else if (classId === '9' || classId === 'class9') {
      if (!class9ChaptersBySubject[sub]) class9ChaptersBySubject[sub] = [];
      class9ChaptersBySubject[sub].push(chapObj);
    }
  });

  // 1. Build Class 10 Roadmap (Even Distribution)
  const roadmap10 = MONTHS.map(m => ({ month: m, chapters: [] }));
  Object.keys(class10ChaptersBySubject).forEach(subject => {
    const chapters = class10ChaptersBySubject[subject];
    chapters.sort((a, b) => {
      const numA = getChapterNumber(a);
      const numB = getChapterNumber(b);
      if (numA !== numB) return numA - numB;
      return a.title.localeCompare(b.title);
    });
    chapters.forEach((chap, idx) => {
      const monthIndex = idx % 9;
      roadmap10[monthIndex].chapters.push(chap);
    });
  });

  // 2. Build Class 9 Roadmap (Weighted Distribution)
  const roadmap9 = MONTHS.map(m => ({ month: m, chapters: [] }));
  Object.keys(class9ChaptersBySubject).forEach(subject => {
    const chapters = class9ChaptersBySubject[subject];
    chapters.sort((a, b) => {
      const numA = getChapterNumber(a);
      const numB = getChapterNumber(b);
      if (numA !== numB) return numA - numB;
      return a.title.localeCompare(b.title);
    });
    
    const N = chapters.length;
    chapters.forEach((chap, j) => {
      // Calculate normalized relative position of chapter j in the sequence
      const position = (j + 0.5) / N;
      
      // Determine the month bucket based on cumulative weights
      let monthIndex = 0;
      while (monthIndex < 8 && position > CUMULATIVE_WEIGHTS[monthIndex]) {
        monthIndex++;
      }
      roadmap9[monthIndex].chapters.push(chap);
    });
  });

  const tsContent = `// Auto-generated 9-Month Roadmap for Class 10
export const ROADMAP_DATA = ${JSON.stringify(roadmap10, null, 2)};

// Auto-generated 9-Month Roadmap for Class 9 (Weighted Workload)
export const ROADMAP_DATA_9 = ${JSON.stringify(roadmap9, null, 2)};
`;

  if (!fs.existsSync('./src/data')) {
    fs.mkdirSync('./src/data');
  }

  fs.writeFileSync('./src/data/roadmapData.ts', tsContent);
  console.log("Roadmaps successfully generated at src/data/roadmapData.ts");
  process.exit(0);
}

run().catch(e => {
  console.error(e);
  process.exit(1);
});
