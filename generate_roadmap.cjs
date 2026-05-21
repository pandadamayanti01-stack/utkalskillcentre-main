const admin = require('firebase-admin');
const fs = require('fs');

const { getFirestore } = require('firebase-admin/firestore');
const serviceAccount = require('./utkal-admin-sdk.json');
const app = admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = getFirestore(app, 'utkal-prod');

const MONTHS = [
  "June 2026", "July 2026", "August 2026", "September 2026",
  "October 2026", "November 2026", "December 2026",
  "January 2027", "February 2027"
];

async function run() {
  console.log("Fetching Class 10 chapters...");
  const snap = await db.collection('chapters').get();
  
  let chaptersBySubject = {};

  snap.forEach(doc => {
    const data = doc.data();
    if (data.class === '10' || data.class === 'Class 10' || data.class === 'class10') {
      const title = data.title || '';
      
      // Do not consider Answer Keys as chapters in the roadmap
      if (typeof title === 'string' && title.toLowerCase().includes('answer key')) return;
      if (typeof title === 'object' && ((title.en || '').toLowerCase().includes('answer key') || (title.or || '').toLowerCase().includes('answer key'))) return;

      const sub = data.subject || 'other';
      if (!chaptersBySubject[sub]) chaptersBySubject[sub] = [];
      chaptersBySubject[sub].push({
        id: doc.id,
        title: title,
        subject: sub,
        thumbnail: data.thumbnail || null
      });
    }
  });

  // Distribute evenly across 9 months
  const roadmap = MONTHS.map(m => ({ month: m, chapters: [] }));
  
  // Advanced sorting logic matching Digital Library
  const getChapterNumber = (c) => {
    if (typeof c.number === 'number') return c.number;
    if (typeof c.chapterNumber === 'number') return c.chapterNumber;
    if (typeof c.index === 'number') return c.index;

    const idMatch = String(c.id).match(/ch[_\-\s]?(\d+)/i);
    if (idMatch) return parseInt(idMatch[1], 10);

    const urlStr = String(c.pdfUrl || c.download_url || c.driveUrl || '');
    const decodedUrl = decodeURIComponent(urlStr);
    const urlMatch = decodedUrl.match(/Chapter[_\-\s]?(\d+)/i) || decodedUrl.match(/Ch[_\-\s]?(\d+)/i);
    if (urlMatch) return parseInt(urlMatch[1], 10);

    const titleStr = typeof c.title === 'string' ? c.title : (c.title?.en || c.title?.or || '');
    const titleMatch = titleStr.match(/Chapter[_\-\s]?\s*(\d+)/i) || titleStr.match(/Ch[_\-\s]?\s*(\d+)/i);
    if (titleMatch) return parseInt(titleMatch[1], 10);

    // Hardcode fallback for Odia Algebra/Geometry chapters missing numbers in their titles
    if (titleStr.includes('ସରଳ ସହସମୀକରଣ')) return 1;
    if (titleStr.includes('ଦ୍ଵିଘାତ ସମୀକରଣ')) return 2;
    if (titleStr.includes('ସମାନ୍ତର ପ୍ରଗତି')) return 3; // Arithmetic Progression
    if (titleStr.includes('ସ୍ଥାନାଙ୍କ ଜ୍ୟାମିତି')) return 4; // Coordinate Geometry (Alg)
    if (titleStr.includes('ସମ୍ଭାବ୍ୟତା')) return 5; // Probability
    if (titleStr.includes('ପରିସଂଖ୍ୟାନ')) return 6; // Statistics

    if (titleStr.includes('ଜ୍ୟାମିତିରେ ସାଦୃଶ୍ୟ')) return 1; // Geometry Similarity
    if (titleStr.includes('Circle') || titleStr.includes('ବୃତ୍ତ')) return 2; // Circle
    if (titleStr.includes('Construction') || titleStr.includes('ଅଙ୍କନ')) return 3; // Construction
    if (titleStr.includes('Mensuration') || titleStr.includes('ପରିମିତି')) return 4; // Mensuration

    return 999;
  };

  Object.keys(chaptersBySubject).forEach(subject => {
    const chapters = chaptersBySubject[subject];
    
    // Sort chapters by extracted number, fallback to alphabetical
    chapters.sort((a, b) => {
      const numA = getChapterNumber(a);
      const numB = getChapterNumber(b);
      if (numA !== numB) {
        return numA - numB;
      }
      return a.title.localeCompare(b.title);
    });
    
    // Distribute these chapters into the 9 months
    chapters.forEach((chap, idx) => {
      const monthIndex = idx % 9;
      roadmap[monthIndex].chapters.push(chap);
    });
  });

  const tsContent = `// Auto-generated 9-Month Roadmap for Class 10
export const ROADMAP_DATA = ${JSON.stringify(roadmap, null, 2)};
`;

  if (!fs.existsSync('./src/data')) {
    fs.mkdirSync('./src/data');
  }

  fs.writeFileSync('./src/data/roadmapData.ts', tsContent);
  console.log("Roadmap successfully generated at src/data/roadmapData.ts");
  process.exit(0);
}

run().catch(e => {
  console.error(e);
  process.exit(1);
});
