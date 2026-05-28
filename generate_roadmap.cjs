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
  if (t.includes('hockey')) {
    return false;
  }
  return (
    t.includes('answer') ||
    t.includes('key') ||
    t.includes('uttaramala') ||
    t.includes('ଉତ୍ତରମାଳା') ||
    t.includes('ପରିଶିଷ୍ଟ') ||
    t.includes('parisistha') ||
    t.includes('parisista') ||
    (t.includes('solution') && !t.includes('dissolution') && !t.includes('resolution')) ||
    t.includes('uttar') ||
    t.includes('teacher') ||
    t.includes('guideline') ||
    t.includes('guide') ||
    t.includes('appendix') ||
    t.includes('apprentix') ||
    t.includes('template') ||
    t.includes('assessment')
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
  
  const chaptersByClassAndSubject = {};

  snap.forEach(doc => {
    const data = doc.data();
    const classIdRaw = (data.class || '').toLowerCase().trim();
    
    // Normalize class name (e.g. "class4" -> "4", "Class 4" -> "4")
    const classMatch = classIdRaw.match(/\d+/);
    if (!classMatch) return;
    const classNum = classMatch[0]; // "1" to "10"
    
    const title = data.title || '';
    const titleEn = data.title_en || '';
    const titleOr = data.title_or || '';
    if (isAnswerKey(title) || isAnswerKey(titleEn) || isAnswerKey(titleOr)) return;
    if (typeof title === 'object' && (isAnswerKey(title.en || '') || isAnswerKey(title.or || ''))) return;

    const sub = data.subject || 'other';
    const chapObj = {
      id: doc.id,
      title: title,
      title_en: data.title_en || null,
      title_or: data.title_or || null,
      subject: sub,
      thumbnail: data.thumbnail || null
    };

    if (!chaptersByClassAndSubject[classNum]) {
      chaptersByClassAndSubject[classNum] = {};
    }
    if (!chaptersByClassAndSubject[classNum][sub]) {
      chaptersByClassAndSubject[classNum][sub] = [];
    }
    chaptersByClassAndSubject[classNum][sub].push(chapObj);
  });

  const roadmaps = {};
  for (let c = 1; c <= 10; c++) {
    const classStr = String(c);
    const roadmap = MONTHS.map(m => ({ month: m, chapters: [] }));
    const subjectsMap = chaptersByClassAndSubject[classStr] || {};

    Object.keys(subjectsMap).forEach(subject => {
      const chapters = subjectsMap[subject];
      chapters.sort((a, b) => {
        const numA = getChapterNumber(a);
        const numB = getChapterNumber(b);
        if (numA !== numB) return numA - numB;
        return a.title.localeCompare(b.title);
      });

      if (c === 8 || c === 9 || c === 10) {
        // Use weighted workload for Class 8, 9, 10
        const N = chapters.length;
        chapters.forEach((chap, j) => {
          const position = (j + 0.5) / N;
          let monthIndex = 0;
          while (monthIndex < 8 && position > CUMULATIVE_WEIGHTS[monthIndex]) {
            monthIndex++;
          }
          roadmap[monthIndex].chapters.push(chap);
        });
      } else {
        // Even distribution
        chapters.forEach((chap, idx) => {
          const monthIndex = idx % 9;
          roadmap[monthIndex].chapters.push(chap);
        });
      }
    });
    roadmaps[classStr] = roadmap;
  }

  let tsContent = '';
  for (let c = 1; c <= 10; c++) {
    const varName = c === 10 ? 'ROADMAP_DATA' : `ROADMAP_DATA_${c}`;
    tsContent += `// Auto-generated 9-Month Roadmap for Class ${c}\n`;
    tsContent += `export const ${varName} = ${JSON.stringify(roadmaps[String(c)], null, 2)};\n\n`;
  }
  
  // For backwards compatibility, export ROADMAP_DATA_10 as well
  tsContent += `export const ROADMAP_DATA_10 = ROADMAP_DATA;\n`;

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
